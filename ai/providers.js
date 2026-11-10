'use strict';

// Cliente de IA con dos dialectos: Gemini nativo y OpenAI-compatible
// (OpenAI, OpenRouter, LM Studio, Ollama en /v1, etc.).
// Los mensajes internos usan un formato común:
//   { role:'user'|'assistant'|'tool', content, tool_calls?, tool_call_id?, name? }

const config = require('./config');

const TIMEOUT = 120000;

function httpError(status, body) {
  let detail = '';
  try {
    const j = JSON.parse(body);
    detail = (j.error && (j.error.message || j.error)) || j.message || '';
    if (typeof detail !== 'string') detail = JSON.stringify(detail);
  } catch (e) {
    detail = String(body || '').slice(0, 400);
  }
  const err = new Error(`HTTP ${status}${detail ? ': ' + detail : ''}`);
  err.status = status;
  return err;
}

async function post(url, headers, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    const text = await res.text();
    if (!res.ok) throw httpError(res.status, text);
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error('Respuesta del proveedor no es JSON válido');
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('La IA tardó demasiado en responder (timeout)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- conversión a Gemini ----------

function geminiSchema(s) {
  if (!s || typeof s !== 'object') return s;
  const out = {};
  for (const k of Object.keys(s)) {
    if (k === 'type' && typeof s[k] === 'string') out[k] = s[k].toUpperCase();
    else if (k === 'properties') {
      out[k] = {};
      for (const p of Object.keys(s[k])) out[k][p] = geminiSchema(s[k][p]);
    } else if (k === 'items') out[k] = geminiSchema(s[k]);
    else if (k === 'additionalProperties') continue;
    else out[k] = s[k];
  }
  return out;
}

function dataPart(url) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(url || '');
  if (!m) return null;
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

function toGemini(messages) {
  const contents = [];
  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'tool') {
      const part = {
        functionResponse: {
          name: m.name || 'tool',
          response: { result: String(m.content == null ? '' : m.content).slice(0, 12000) }
        }
      };
      const last = contents[contents.length - 1];
      if (last && last.role === 'user') last.parts.push(part);
      else contents.push({ role: 'user', parts: [part] });
      continue;
    }
    const parts = [];
    if (Array.isArray(m.content)) {
      for (const p of m.content) {
        if (p.type === 'text') parts.push({ text: p.text });
        else if (p.type === 'image') {
          const ip = dataPart(p.dataUrl);
          if (ip) parts.push(ip);
        }
      }
    } else if (m.content) {
      parts.push({ text: String(m.content) });
    }
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) {
      for (const c of m.tool_calls) parts.push({ functionCall: { name: c.name, args: c.args || {} } });
    }
    if (!parts.length) continue;
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role && role === 'user') {
      last.parts.push(...parts);
    } else {
      contents.push({ role, parts });
    }
  }
  return contents;
}

async function gemini(messages, tools, system) {
  const key = config.apiKey('gemini');
  if (!key) throw new Error('Falta la clave de Gemini. Añádela en Ajustes.');
  const body = {
    contents: toGemini(messages),
    generationConfig: { temperature: 0.55, maxOutputTokens: 2048 }
  };
  const gmodel = config.model('gemini').replace(/^models\//i, '');
  // En 2.5 Flash el "pensamiento" añade latencia y a veces se cuela en el
  // texto. Para una mascota queremos respuestas rápidas y limpias.
  if (/2\.5/i.test(gmodel) && /flash/i.test(gmodel)) {
    body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (tools && tools.length) {
    body.tools = [{ functionDeclarations: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: geminiSchema(t.parameters)
    })) }];
  }
  const url = `${config.endpoint()}/models/${encodeURIComponent(config.model('gemini').replace(/^models\//i, ''))}:generateContent`;
  const data = await post(url, { 'x-goog-api-key': key }, body);
  const cand = (data.candidates || [])[0];
  if (!cand) {
    const why = data.promptFeedback && data.promptFeedback.blockReason;
    throw new Error(why ? 'El proveedor bloqueó la petición: ' + why : 'Gemini no devolvió respuesta');
  }
  const parts = (cand.content && cand.content.parts) || [];
  const text = parts.filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
  const calls = [];
  for (const p of parts) {
    if (p.functionCall && p.functionCall.name) {
      calls.push({
        id: 'g_' + Date.now().toString(36) + '_' + calls.length,
        name: p.functionCall.name,
        args: p.functionCall.args || {}
      });
    }
  }
  if (!text && !calls.length && cand.finishReason && cand.finishReason !== 'STOP') {
    throw new Error('Gemini cortó la respuesta (' + cand.finishReason + ')');
  }
  return { text, calls };
}

// ---------- conversión a OpenAI ----------

function toOpenAI(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      out.push({
        role: 'tool',
        tool_call_id: m.tool_call_id || 'call_0',
        name: m.name || undefined,
        content: String(m.content == null ? '' : m.content).slice(0, 12000)
      });
      continue;
    }
    if (m.role === 'assistant') {
      const msg = { role: 'assistant', content: m.content || '' };
      if (Array.isArray(m.tool_calls) && m.tool_calls.length) {
        msg.tool_calls = m.tool_calls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.args || {}) }
        }));
      }
      out.push(msg);
      continue;
    }
    if (Array.isArray(m.content)) {
      out.push({
        role: 'user',
        content: m.content.map((p) => p.type === 'image'
          ? { type: 'image_url', image_url: { url: p.dataUrl } }
          : { type: 'text', text: p.text })
      });
    } else {
      out.push({ role: m.role === 'system' ? 'system' : 'user', content: String(m.content || '') });
    }
  }
  return out;
}

async function openai(messages, tools, system) {
  const prov = config.provider();
  const key = config.apiKey(prov);
  if (config.needsKey() && !key) {
    throw new Error('Falta la clave de API. Añádela en Ajustes.');
  }
  const msgs = system ? [{ role: 'system', content: system }].concat(messages) : messages;
  const body = {
    model: config.model(prov),
    messages: toOpenAI(msgs),
    temperature: 0.55,
    max_tokens: 2048
  };
  if (tools && tools.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters }
    }));
    body.tool_choice = 'auto';
  }
  const headers = {};
  if (key) headers.Authorization = 'Bearer ' + key;
  const url = config.endpoint() + '/chat/completions';
  let data;
  try {
    data = await post(url, headers, body);
  } catch (e) {
    // Modelos nuevos (o1/o3/gpt-5) rechazan temperature/max_tokens y algunos
    // servidores locales no entienden tool_choice. Reintento mínimo.
    if (e.status === 400) {
      const retry = Object.assign({}, body);
      delete retry.temperature;
      delete retry.max_tokens;
      delete retry.tool_choice;
      data = await post(url, headers, retry);
    } else {
      throw e;
    }
  }
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  if (!msg) {
    const err = data.error && (data.error.message || data.error);
    throw new Error(err ? String(err) : 'El proveedor no devolvió respuesta');
  }
  const calls = (msg.tool_calls || []).map((c, i) => {
    let args = {};
    try {
      args = c.function && c.function.arguments ? JSON.parse(c.function.arguments) : {};
    } catch (e) {
      args = { _parseError: String(c.function && c.function.arguments).slice(0, 200) };
    }
    return { id: c.id || ('c_' + i), name: c.function && c.function.name, args };
  }).filter((c) => c.name);
  return { text: (msg.content || '').trim(), calls };
}

async function chat(messages, tools, system) {
  if (config.provider() === 'gemini') return gemini(messages, tools, system);
  return openai(messages, tools, system);
}

async function test() {
  const r = await chat(
    [{ role: 'user', content: 'Responde solo con la palabra: ok' }],
    [],
    'Eres un test de conexión. Responde exactamente "ok".'
  );
  return r.text || '(sin texto)';
}

module.exports = { chat, test };

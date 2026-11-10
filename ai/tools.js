'use strict';

// Herramientas que la IA puede invocar. Las sensibles siempre pasan por
// ctx.confirm() antes de tocar el sistema.

const memory = require('./memory');
const sys = require('./system-actions');

const POSES = [
  'idle', 'walk', 'sit', 'read', 'coffee', 'phone', 'dance', 'sleep', 'smoke',
  'breakfast', 'stretch', 'sing', 'game', 'wave', 'yawn', 'shiver', 'cheer',
  'hop', 'spin', 'clap', 'peek', 'fall', 'katana', 'rope', 'hoop', 'broom',
  'umbrella', 'balloon', 'guitar', 'fan', 'brush', 'yoyo', 'camera', 'box',
  'meditate', 'happy', 'jump', 'pet', 'wake'
];

const SYSTEM_ACTIONS = {
  volume_up: 'Sube el volumen',
  volume_down: 'Baja el volumen',
  mute: 'Silencia o reactiva el sonido',
  lock: 'Bloquea la sesión',
  show_desktop: 'Muestra el escritorio'
};

function defs(allowComputer) {
  const tools = [
    {
      name: 'move_pet',
      description: 'Mueve a la mascota por la pantalla. Úsalo cuando te pidan que vayas a un sitio ("ven aquí", "ponte a la izquierda"). Se desplaza caminando; con teleport=true aparece de golpe entre chispas.',
      parameters: {
        type: 'object',
        properties: {
          where: {
            type: 'string',
            enum: ['izquierda', 'derecha', 'centro', 'cursor', 'pantalla'],
            description: 'Destino: borde izquierdo, borde derecho, centro, junto al cursor o una pantalla concreta.'
          },
          display: { type: 'integer', description: 'Número de pantalla (1 = principal). Solo si where="pantalla".' },
          teleport: { type: 'boolean', description: 'Si es true se teletransporta con chispas en vez de caminar.' }
        },
        required: ['where']
      }
    },
    {
      name: 'pet_action',
      description: 'Hace una animación o acción física de la mascota (bailar, dormir, leer, saludar, saltar...).',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: POSES, description: 'Nombre de la animación.' }
        },
        required: ['action']
      }
    },
    {
      name: 'say',
      description: 'Dice algo en la burbuja de la mascota. El texto debe ser corto (máx. 120 caracteres).',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Frase corta y natural.' } },
        required: ['text']
      }
    },
    {
      name: 'open_app',
      description: 'Abre una aplicación del sistema. Solo las permitidas: notepad, calculadora, paint, explorer, terminal, code, chrome, edge, firefox, spotify, discord, steam, word, excel, powerpoint, configuracion.',
      parameters: {
        type: 'object',
        properties: { app: { type: 'string', description: 'Nombre de la app en minúsculas.' } },
        required: ['app']
      }
    },
    {
      name: 'open_url',
      description: 'Abre una página web en el navegador. Solo http/https.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'URL completa, por ejemplo https://es.wikipedia.org' } },
        required: ['url']
      }
    },
    {
      name: 'set_timer',
      description: 'Pone un temporizador. Cuando termine, la mascota avisa.',
      parameters: {
        type: 'object',
        properties: {
          minutes: { type: 'number', description: 'Duración en minutos (puede ser decimal, mínimo 0.1).' },
          label: { type: 'string', description: 'Para qué es el temporizador.' }
        },
        required: ['minutes']
      }
    },
    {
      name: 'set_reminder',
      description: 'Crea un recordatorio para una hora concreta. Usa la hora actual del sistema para calcular la fecha.',
      parameters: {
        type: 'object',
        properties: {
          when: { type: 'string', description: 'Fecha y hora ISO 8601 local, por ejemplo 2026-05-04T15:30:00. Si ya pasó hoy, será mañana.' },
          text: { type: 'string', description: 'Qué hay que recordar.' }
        },
        required: ['when', 'text']
      }
    },
    {
      name: 'save_note',
      description: 'Guarda una nota rápida en el cuaderno de la mascota.',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string', description: 'Contenido de la nota.' } },
        required: ['text']
      }
    },
    {
      name: 'list_notes',
      description: 'Lee las notas guardadas.',
      parameters: { type: 'object', properties: {} }
    },
    {
      name: 'search_files',
      description: 'Busca archivos por nombre en Escritorio, Documentos y Descargas.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Parte del nombre del archivo.' } },
        required: ['query']
      }
    },
    {
      name: 'system_action',
      description: 'Acciones del sistema: volumen, silenciar, bloquear sesión o mostrar escritorio.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: Object.keys(SYSTEM_ACTIONS), description: 'Acción a ejecutar.' }
        },
        required: ['action']
      }
    },
    {
      name: 'get_time',
      description: 'Devuelve la fecha y hora actuales del sistema.',
      parameters: { type: 'object', properties: {} }
    },
    {
      name: 'wait',
      description: 'Espera unos segundos antes del siguiente paso (máximo 5).',
      parameters: {
        type: 'object',
        properties: { seconds: { type: 'number', description: 'Segundos a esperar.' } },
        required: ['seconds']
      }
    }
  ];

  if (allowComputer) {
    tools.push(
      {
        name: 'look_at_screen',
        description: 'Hace una captura de la pantalla para ver qué hay. Úsalo antes de mover el ratón o escribir, y otra vez después de cada acción para comprobar el resultado. Las coordenadas de la imagen van en una cuadrícula de 0 a 1000 (x de izquierda a derecha, y de arriba abajo).',
        parameters: { type: 'object', properties: {} }
      },
      {
        name: 'mouse_move',
        description: 'Mueve el ratón a un punto de la última captura (cuadrícula 0-1000).',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: '0 = borde izquierdo, 1000 = borde derecho.' },
            y: { type: 'number', description: '0 = arriba, 1000 = abajo.' }
          },
          required: ['x', 'y']
        }
      },
      {
        name: 'mouse_click',
        description: 'Hace clic en un punto de la pantalla (cuadrícula 0-1000). Si omites x/y, hace clic donde esté el ratón.',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            button: { type: 'string', enum: ['left', 'right', 'middle'] },
            double: { type: 'boolean', description: 'Doble clic.' }
          }
        }
      },
      {
        name: 'mouse_drag',
        description: 'Arrastra desde un punto hasta otro (cuadrícula 0-1000).',
        parameters: {
          type: 'object',
          properties: {
            x1: { type: 'number' }, y1: { type: 'number' },
            x2: { type: 'number' }, y2: { type: 'number' },
            button: { type: 'string', enum: ['left', 'right'] }
          },
          required: ['x1', 'y1', 'x2', 'y2']
        }
      },
      {
        name: 'scroll',
        description: 'Hace scroll en la ventana activa.',
        parameters: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['up', 'down'] },
            amount: { type: 'integer', description: 'Número de pasos (1-10).' }
          },
          required: ['direction']
        }
      },
      {
        name: 'keyboard_type',
        description: 'Escribe texto en la ventana activa (respeta tildes y símbolos).',
        parameters: {
          type: 'object',
          properties: { text: { type: 'string' } },
          required: ['text']
        }
      },
      {
        name: 'keyboard_key',
        description: 'Pulsa una tecla o atajo: enter, tab, esc, backspace, delete, arriba/abajo/izquierda/derecha, space, ctrl+a, ctrl+c, ctrl+v, ctrl+s, alt+tab, alt+f4, etc.',
        parameters: {
          type: 'object',
          properties: { key: { type: 'string' } },
          required: ['key']
        }
      }
    );
  }

  return tools;
}

function clampN(v) {
  const n = Number(v);
  return isNaN(n) ? 500 : Math.max(0, Math.min(1000, n));
}

async function execute(name, args, ctx) {
  args = args || {};
  const stopped = () => { if (ctx.stopped && ctx.stopped()) throw new Error('Tarea detenida por el usuario'); };
  stopped();

  switch (name) {
    case 'move_pet': {
      return ctx.movePet(args.where, args.display, !!args.teleport);
    }
    case 'pet_action': {
      if (POSES.indexOf(args.action) < 0) return 'Animación desconocida: ' + args.action;
      ctx.pose(args.action);
      return 'Animación "' + args.action + '" en marcha.';
    }
    case 'say': {
      const t = String(args.text || '').trim().slice(0, 160);
      if (!t) return 'No dijiste nada.';
      ctx.say(t);
      return 'Dicho en la burbuja.';
    }
    case 'open_app': {
      const label = await ctx.confirm({
        tool: name,
        title: 'Abrir una aplicación',
        detail: 'Quiere abrir «' + args.app + '».',
        always: 'open_app',
        risk: 'low'
      });
      if (!label) return 'El usuario dijo que no.';
      const opened = sys.openApp(args.app);
      return 'Abierto: ' + opened + '.';
    }
    case 'open_url': {
      const ok = await ctx.confirm({
        tool: name,
        title: 'Abrir una página web',
        detail: 'Quiere abrir ' + String(args.url || '').slice(0, 300),
        always: 'open_url',
        risk: 'low'
      });
      if (!ok) return 'El usuario dijo que no.';
      const u = await sys.openUrl(args.url);
      return 'Abierto en el navegador: ' + u;
    }
    case 'set_timer': {
      const mins = Number(args.minutes);
      if (!isFinite(mins) || mins <= 0 || mins > 1440) return 'Duración no válida (0.1 a 1440 minutos).';
      const r = ctx.addTimer(mins, String(args.label || 'Temporizador').slice(0, 80));
      return 'Temporizador de ' + mins + ' min (' + r.at.toLocaleTimeString('es-ES') + '): ' + r.label;
    }
    case 'set_reminder': {
      const d = new Date(args.when);
      if (isNaN(d.getTime())) return 'Fecha no válida. Usa ISO 8601.';
      const r = ctx.addReminder(d, String(args.text || '').slice(0, 300));
      return 'Recordatorio para ' + d.toLocaleString('es-ES') + ': ' + r.text;
    }
    case 'save_note': {
      const n = memory.addNote(args.text);
      if (!n) return 'La nota estaba vacía.';
      return 'Nota guardada (' + n.at.slice(0, 10) + ').';
    }
    case 'list_notes': {
      const list = memory.listNotes();
      if (!list.length) return 'No hay notas guardadas.';
      return list.slice(0, 20).map((n) => '- [' + n.at.slice(0, 10) + '] ' + n.text).join('\n');
    }
    case 'search_files': {
      const r = await sys.searchFiles(args.query);
      if (!r.length) return 'No encontré archivos con «' + args.query + '».';
      return 'Encontrados (máx. 30):\n' + r.join('\n');
    }
    case 'system_action': {
      const act = String(args.action || '');
      if (!SYSTEM_ACTIONS[act]) return 'Acción desconocida.';
      const ok = await ctx.confirm({
        tool: name,
        title: 'Acción del sistema',
        detail: SYSTEM_ACTIONS[act] + '.',
        always: act === 'volume_up' || act === 'volume_down' ? 'volume' : null,
        risk: act === 'lock' ? 'high' : 'low'
      });
      if (!ok) return 'El usuario dijo que no.';
      if (act === 'volume_up') await sys.volume('up', 3);
      else if (act === 'volume_down') await sys.volume('down', 3);
      else if (act === 'mute') await sys.volume('mute', 1);
      else if (act === 'lock') await sys.lockScreen();
      else if (act === 'show_desktop') await sys.showDesktop();
      return 'Hecho: ' + SYSTEM_ACTIONS[act] + '.';
    }
    case 'get_time': {
      const now = new Date();
      return now.toLocaleString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    case 'wait': {
      const s = Math.max(0.2, Math.min(5, Number(args.seconds) || 1));
      await new Promise((r) => setTimeout(r, s * 1000));
      return 'Esperados ' + s + ' s.';
    }
    case 'look_at_screen': {
      const ok = await ctx.confirm({
        tool: name,
        title: 'Mirar tu pantalla',
        detail: 'Quiere hacer una captura para ver la pantalla.',
        always: 'look_at_screen',
        risk: 'medium'
      });
      if (!ok) return 'El usuario no quiere que mire la pantalla.';
      const cap = await sys.screenCapture();
      ctx.lastCapture = cap;
      return {
        text: 'Captura tomada de la pantalla ' + (cap.display.primary ? 'principal' : cap.display.id) +
          '. Cuadrícula 0-1000: x de izquierda a derecha, y de arriba abajo.',
        image: cap.dataUrl
      };
    }
    case 'mouse_move': {
      stopped();
      const p = await sys.mouseMove(clampN(args.x), clampN(args.y), ctx.lastCapture && ctx.lastCapture.display);
      ctx.lastPoint = { x: clampN(args.x), y: clampN(args.y) };
      return 'Ratón en (' + p.x + ', ' + p.y + ') físico [' + ctx.lastPoint.x + ', ' + ctx.lastPoint.y + ' de 1000].';
    }
    case 'mouse_click': {
      const ok = await ctx.confirm({
        tool: name,
        title: 'Controlar el ratón',
        detail: args.x === undefined
          ? 'Quiere hacer clic con el ratón.'
          : 'Quiere hacer clic en (' + Math.round(args.x) + ', ' + Math.round(args.y) + ') de 1000.',
        always: 'mouse',
        risk: 'medium'
      });
      if (!ok) return 'El usuario dijo que no.';
      if (args.x === undefined) {
        // Clic en la posición actual: usar el último punto conocido.
        const lp = ctx.lastPoint || { x: 500, y: 500 };
        await sys.mouseClick(lp.x, lp.y, args.button || 'left', !!args.double, ctx.lastCapture && ctx.lastCapture.display);
      } else {
        await sys.mouseClick(clampN(args.x), clampN(args.y), args.button || 'left', !!args.double, ctx.lastCapture && ctx.lastCapture.display);
        ctx.lastPoint = { x: clampN(args.x), y: clampN(args.y) };
      }
      return 'Clic hecho' + (args.double ? ' (doble)' : '') + '.';
    }
    case 'mouse_drag': {
      const ok = await ctx.confirm({
        tool: name,
        title: 'Arrastrar con el ratón',
        detail: 'Quiere arrastrar de (' + Math.round(args.x1) + ',' + Math.round(args.y1) + ') a (' +
          Math.round(args.x2) + ',' + Math.round(args.y2) + ') de 1000.',
        always: 'mouse',
        risk: 'medium'
      });
      if (!ok) return 'El usuario dijo que no.';
      await sys.mouseDrag(clampN(args.x1), clampN(args.y1), clampN(args.x2), clampN(args.y2), args.button || 'left', ctx.lastCapture && ctx.lastCapture.display);
      return 'Arrastre hecho.';
    }
    case 'scroll': {
      stopped();
      await sys.scroll(args.direction === 'up' ? 'up' : 'down', args.amount);
      return 'Scroll ' + (args.direction === 'up' ? 'hacia arriba' : 'hacia abajo') + '.';
    }
    case 'keyboard_type': {
      const ok = await ctx.confirm({
        tool: name,
        title: 'Escribir con el teclado',
        detail: 'Quiere escribir: «' + String(args.text || '').slice(0, 160) + '»',
        always: 'keyboard',
        risk: 'medium'
      });
      if (!ok) return 'El usuario dijo que no.';
      await sys.typeText(args.text);
      return 'Texto escrito.';
    }
    case 'keyboard_key': {
      const ok = await ctx.confirm({
        tool: name,
        title: 'Pulsar una tecla',
        detail: 'Quiere pulsar «' + args.key + '».',
        always: 'keyboard',
        risk: 'medium'
      });
      if (!ok) return 'El usuario dijo que no.';
      await sys.pressKey(args.key);
      return 'Tecla pulsada.';
    }
    default:
      return 'Herramienta desconocida: ' + name;
  }
}

module.exports = { defs, execute, POSES };

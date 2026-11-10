'use strict';

// Notas y recordatorios de la mascota. Todo vive en userData, sin nube.

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function file(name) {
  return path.join(app.getPath('userData'), name);
}

function readJson(name, def) {
  try {
    const v = JSON.parse(fs.readFileSync(file(name), 'utf8'));
    return v == null ? def : v;
  } catch (e) {
    return def;
  }
}

function writeJson(name, value) {
  try {
    fs.mkdirSync(path.dirname(file(name)), { recursive: true });
    fs.writeFileSync(file(name), JSON.stringify(value, null, 2));
  } catch (e) { /* ignorar */ }
}

// ---------- notas ----------

function listNotes() {
  const list = readJson('notes.json', []);
  return Array.isArray(list) ? list : [];
}

function addNote(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  const list = listNotes();
  const note = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: t.slice(0, 2000),
    at: new Date().toISOString()
  };
  list.unshift(note);
  writeJson('notes.json', list.slice(0, 100));
  return note;
}

function deleteNote(id) {
  const list = listNotes();
  const next = list.filter((n) => n.id !== id);
  if (next.length === list.length) return false;
  writeJson('notes.json', next);
  return true;
}

// ---------- recordatorios ----------

function listReminders() {
  const list = readJson('reminders.json', []);
  return (Array.isArray(list) ? list : []).filter((r) => r && r.at && r.text);
}

function addReminder(at, text) {
  const when = new Date(at);
  if (isNaN(when.getTime())) return null;
  const list = listReminders();
  const r = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    at: when.toISOString(),
    text: String(text || '').trim().slice(0, 500),
    fired: false
  };
  if (!r.text) return null;
  list.push(r);
  writeJson('reminders.json', list.slice(-100));
  return r;
}

function markFired(id) {
  const list = listReminders();
  const r = list.find((x) => x.id === id);
  if (r) r.fired = true;
  writeJson('reminders.json', list);
}

function pendingReminders() {
  const now = Date.now();
  return listReminders().filter((r) => !r.fired && new Date(r.at).getTime() <= now);
}

module.exports = {
  listNotes,
  addNote,
  deleteNote,
  listReminders,
  addReminder,
  markFired,
  pendingReminders
};

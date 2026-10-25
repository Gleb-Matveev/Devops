import "./style.css";

const API = "/api";

const $ = (id) => document.getElementById(id);

let lastIds = new Set();

function showError(msg) {
  $("error").textContent = msg;
  $("error").hidden = !msg;
}

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.status === 204 ? null : res.json();
}

function formatTs(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `[${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}]`;
}

function renderNotes(notes) {
  const list = $("notes");
  list.innerHTML = "";

  const ordered = [...notes].reverse();
  for (const n of ordered) {
    const li = document.createElement("li");
    if (lastIds.size && !lastIds.has(n.id)) li.classList.add("fresh");

    const ts = document.createElement("span");
    ts.className = "ts";
    ts.textContent = formatTs(n.created_at);

    const id = document.createElement("span");
    id.className = "id";
    id.textContent = `#${n.id}`;

    const msg = document.createElement("span");
    msg.className = "msg";
    msg.textContent = n.text;

    const rm = document.createElement("button");
    rm.className = "rm";
    rm.title = "удалить";
    rm.textContent = "rm";
    rm.onclick = () => removeNote(n.id);

    li.append(ts, id, msg, rm);
    list.append(li);
  }

  lastIds = new Set(notes.map((n) => n.id));
  $("empty").hidden = notes.length > 0;
  $("count").textContent = `${notes.length} ${notes.length === 1 ? "entry" : "entries"}`;

  const body = document.querySelector(".term-body");
  body.scrollTop = body.scrollHeight;
}

async function loadNotes() {
  try {
    renderNotes(await request("/notes"));
    showError("");
  } catch (e) {
    showError(`не удалось загрузить журнал (${e.message})`);
  }
}

async function removeNote(id) {
  try {
    await request(`/notes/${id}`, { method: "DELETE" });
    await loadNotes();
  } catch (e) {
    showError(`rm #${id}: ${e.message}`);
  }
}

$("note-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const input = $("note-text");
  const text = input.value.trim();
  if (!text) return;
  try {
    await request("/notes", { method: "POST", body: JSON.stringify({ text }) });
    input.value = "";
    await loadNotes();
  } catch (e) {
    showError(`add: ${e.message}`);
  }
});

document.querySelector(".term").addEventListener("click", (ev) => {
  if (!window.getSelection().toString() && ev.target.tagName !== "BUTTON") {
    $("note-text").focus();
  }
});

async function loadInfo() {
  try {
    const info = await request("/info");
    $("sb-version").textContent = `v${info.version}`;
    $("sb-host").textContent = `host: ${info.hostname}`;
    $("prompt-host").textContent = info.hostname;
  } catch {
    $("sb-version").textContent = "v?";
    $("sb-host").textContent = "host: offline";
  }
}

async function loadStatus() {
  const el = $("status");
  try {
    await request("/ready");
    el.textContent = "db: up";
    el.className = "sb-seg sb-db ok";
  } catch {
    el.textContent = "db: down";
    el.className = "sb-seg sb-db bad";
  }
}

function tick() {
  $("clock").textContent = new Date().toLocaleTimeString("ru-RU");
}

loadNotes();
loadInfo();
loadStatus();
tick();
setInterval(tick, 1000);
setInterval(() => { loadInfo(); loadStatus(); }, 5000);

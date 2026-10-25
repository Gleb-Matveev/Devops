const API = "/api";

const $ = (id) => document.getElementById(id);

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

function renderNotes(notes) {
  const list = $("notes");
  list.innerHTML = "";
  for (const n of notes) {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.className = "text";
    text.textContent = n.text;

    const date = document.createElement("span");
    date.className = "date";
    date.textContent = new Date(n.created_at).toLocaleString("ru-RU");

    const del = document.createElement("button");
    del.title = "Удалить";
    del.textContent = "✕";
    del.onclick = () => removeNote(n.id);

    li.append(text, date, del);
    list.append(li);
  }
  $("empty").hidden = notes.length > 0;
}

async function loadNotes() {
  try {
    renderNotes(await request("/notes"));
    showError("");
  } catch (e) {
    showError("Не удалось загрузить заметки: " + e.message);
  }
}

async function removeNote(id) {
  try {
    await request(`/notes/${id}`, { method: "DELETE" });
    await loadNotes();
  } catch (e) {
    showError("Не удалось удалить: " + e.message);
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
    showError("Не удалось сохранить: " + e.message);
  }
});

async function loadInfo() {
  try {
    const info = await request("/info");
    $("info").textContent = `backend v${info.version} @ ${info.hostname}`;
  } catch {
    $("info").textContent = "backend: недоступен";
  }
}

async function loadStatus() {
  const badge = $("status");
  try {
    await request("/ready");
    badge.textContent = "DB: ok";
    badge.className = "badge ok";
  } catch {
    badge.textContent = "DB: недоступна";
    badge.className = "badge bad";
  }
}

loadNotes();
loadInfo();
loadStatus();
setInterval(() => { loadInfo(); loadStatus(); }, 5000);

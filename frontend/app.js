/* Escala de Trabalho — front-end
   Regras:
   - Visualização é pública: nada de login obrigatório, nada de popup.
   - Visibilidade é sempre controlada pela classe .is-hidden (o CSS garante
     display:none !important), nunca por display inline.
*/

const API = "/api/v1";

const state = {
  token: localStorage.getItem("token") || null,
  workers: [],
  sectors: [],
  designations: [],
  date: todayISO(),
};

/* ---------------- utils ---------------- */

function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function $(id) {
  return document.getElementById(id);
}

function show(el) {
  if (el) el.classList.remove("is-hidden");
}

function hide(el) {
  if (el) el.classList.add("is-hidden");
}

function toggleClass(el, cls, on) {
  if (el) el.classList.toggle(cls, Boolean(on));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function hhmm(time) {
  return String(time || "").slice(0, 5);
}

function toSeconds(time) {
  const [h, m, s] = String(time).split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

function nowSeconds() {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

function feedback(el, message, kind) {
  if (!el) return;
  el.textContent = message;
  el.className = `feedback ${kind}`;
}

function clearFeedback(el) {
  if (!el) return;
  el.className = "feedback is-hidden";
  el.textContent = "";
}

const isAdmin = () => Boolean(state.token);

/* ---------------- api ---------------- */

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    throw new Error("Sessão de admin expirada. Entre novamente.");
  }

  if (!res.ok) {
    let detail = "Não foi possível completar a operação.";
    try {
      const data = await res.json();
      if (data && data.detail) detail = data.detail;
    } catch (_) { /* resposta sem json */ }
    throw new Error(detail);
  }

  return res.status === 204 ? null : res.json();
}

/* ---------------- sessão ---------------- */

function setToken(token) {
  state.token = token;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
  renderAdminState();
}

function renderAdminState() {
  const admin = isAdmin();

  toggleClass($("login-form"), "is-hidden", admin);
  toggleClass($("admin-row"), "is-hidden", !admin);
  toggleClass($("admin-btn"), "is-hidden", admin);

  if (admin) show($("adminbar"));
  else {
    hide($("adminbar"));
    closeAllPanels();
  }

  renderSchedule();
}

async function login(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error("E-mail ou senha inválidos.");

  const data = await res.json();
  setToken(data.access_token);
}

/* ---------------- painéis ---------------- */

const PANELS = ["designation", "workers", "sectors"];

function closeAllPanels() {
  PANELS.forEach((name) => hide($(`panel-${name}`)));
}

function togglePanel(name) {
  const panel = $(`panel-${name}`);
  if (!panel) return;

  const wasOpen = !panel.classList.contains("is-hidden");
  closeAllPanels();
  if (!wasOpen) show(panel);
}

/* ---------------- relógio ---------------- */

function tickClock() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  $("clock").textContent = `${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderWeekday() {
  const [y, m, d] = state.date.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  $("weekday-label").textContent = label.charAt(0).toUpperCase() + label.slice(1);
}

/* ---------------- dados ---------------- */

async function loadWorkers() {
  state.workers = await api("/workers");
  renderWorkerOptions();
  renderWorkersList();
}

async function loadSectors() {
  state.sectors = await api("/sectors");
  renderSectorOptions();
  renderSectorsList();
}

async function loadDesignations() {
  state.designations = await api(`/designations?event_date=${state.date}`);
  renderSchedule();
}

/* ---------------- escala ---------------- */

function renderSchedule() {
  const isToday = state.date === todayISO();
  const now = nowSeconds();

  const current = [];
  const upcoming = [];

  state.designations.forEach((d) => {
    const start = toSeconds(d.shift_start);
    const end = toSeconds(d.shift_end);

    if (isToday && start <= now && now <= end) current.push(d);
    else if (!isToday || start > now) upcoming.push(d);
  });

  const byStart = (a, b) => toSeconds(a.shift_start) - toSeconds(b.shift_start);
  renderCards("current-list", "current-empty", current.sort(byStart));
  renderCards("next-list", "next-empty", upcoming.sort(byStart));
}

function renderCards(listId, emptyId, items) {
  const list = $(listId);
  list.innerHTML = "";

  items.forEach((d) => {
    const li = document.createElement("li");
    li.className = "card";
    if (d.substituted) li.classList.add("is-substituted");
    else if (d.confirmed_present) li.classList.add("is-present");

    const tag = d.substituted
      ? '<span class="tag tag-substituted">Substituído</span>'
      : d.confirmed_present
      ? '<span class="tag tag-present">Presente</span>'
      : "";

    const actions = isAdmin()
      ? `<div class="card-actions">
           <button type="button" class="btn-mini ${d.confirmed_present ? "on" : ""}"
                   data-action="present" data-id="${d.id}">Presente</button>
           <button type="button" class="btn-mini ${d.substituted ? "on-amber" : ""}"
                   data-action="substituted" data-id="${d.id}">Substituído</button>
         </div>`
      : "";

    li.innerHTML = `
      <div class="card-main">
        <div class="card-name">${esc(d.worker_name)}${tag}</div>
        <div class="card-meta">${esc(hhmm(d.shift_start))} – ${esc(hhmm(d.shift_end))}${
          d.sector ? ` · ${esc(d.sector)}` : ""
        }</div>
      </div>
      ${actions}`;

    list.appendChild(li);
  });

  toggleClass($(emptyId), "is-hidden", items.length > 0);
}

async function toggleStatus(id, field) {
  const designation = state.designations.find((d) => String(d.id) === String(id));
  if (!designation) return;

  try {
    const updated = await api(`/designations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: !designation[field] }),
    });

    const index = state.designations.findIndex((d) => d.id === updated.id);
    if (index >= 0) state.designations[index] = updated;
    renderSchedule();
  } catch (err) {
    alert(err.message);
  }
}

/* ---------------- listas de admin ---------------- */

function renderWorkerOptions() {
  const select = $("designation-worker");
  select.innerHTML = '<option value="" disabled selected>Selecione</option>';
  state.workers.forEach((w) => {
    const option = document.createElement("option");
    option.value = w.id;
    option.textContent = w.name;
    select.appendChild(option);
  });
}

function renderSectorOptions() {
  const select = $("designation-sector");
  select.innerHTML = '<option value="">Sem setor</option>';
  state.sectors.forEach((s) => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.sector;
    select.appendChild(option);
  });
}

function renderWorkersList() {
  const list = $("workers-list");
  list.innerHTML = "";

  state.workers.forEach((w) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${esc(w.name)} <span class="list-meta">${esc(w.congregation)}</span></span>
      <button type="button" class="btn-link-danger" data-remove-worker="${w.id}">Remover</button>`;
    list.appendChild(li);
  });
}

function renderSectorsList() {
  const list = $("sectors-list");
  list.innerHTML = "";

  state.sectors.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${esc(s.sector)}</span>
      <button type="button" class="btn-link-danger" data-remove-sector="${s.id}">Remover</button>`;
    list.appendChild(li);
  });
}

/* ---------------- eventos ---------------- */

function wireEvents() {
  $("admin-btn").addEventListener("click", () => {
    show($("adminbar"));
    hide($("admin-btn"));
    $("login-email").focus();
  });

  $("login-cancel").addEventListener("click", () => {
    hide($("adminbar"));
    show($("admin-btn"));
    clearFeedback($("login-feedback"));
    $("login-form").reset();
  });

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("login-feedback");
    clearFeedback(box);

    try {
      await login($("login-email").value.trim(), $("login-password").value);
      e.target.reset();
    } catch (err) {
      feedback(box, err.message, "err");
    }
  });

  $("logout-btn").addEventListener("click", () => {
    setToken(null);
    show($("admin-btn"));
  });

  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => togglePanel(btn.dataset.panel));
  });

  $("date-picker").addEventListener("change", async (e) => {
    state.date = e.target.value || todayISO();
    renderWeekday();
    try {
      await loadDesignations();
    } catch (err) {
      console.error(err);
    }
  });

  // Botões Presente / Substituído nos cards
  document.addEventListener("click", (e) => {
    const action = e.target.dataset ? e.target.dataset.action : null;
    if (action === "present") toggleStatus(e.target.dataset.id, "confirmed_present");
    if (action === "substituted") toggleStatus(e.target.dataset.id, "substituted");
  });

  $("designation-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("designation-feedback");
    const sectorId = $("designation-sector").value;

    try {
      await api("/designations", {
        method: "POST",
        body: JSON.stringify({
          worker_id: Number($("designation-worker").value),
          event_date: $("designation-date").value,
          shift_start: $("designation-start").value,
          shift_end: $("designation-end").value,
          sector_id: sectorId ? Number(sectorId) : null,
        }),
      });

      feedback(box, "Designação salva.", "ok");
      e.target.reset();
      $("designation-date").value = state.date;
      await loadDesignations();
    } catch (err) {
      feedback(box, err.message, "err");
    }
  });

  $("worker-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("worker-feedback");

    try {
      await api("/workers", {
        method: "POST",
        body: JSON.stringify({
          name: $("worker-name").value.trim(),
          phone_number: $("worker-phone").value.trim(),
          congregation: $("worker-congregation").value.trim(),
        }),
      });

      feedback(box, "Trabalhador adicionado.", "ok");
      e.target.reset();
      await loadWorkers();
    } catch (err) {
      feedback(box, err.message, "err");
    }
  });

  $("workers-list").addEventListener("click", async (e) => {
    const id = e.target.dataset.removeWorker;
    if (!id || !confirm("Remover este trabalhador?")) return;

    try {
      await api(`/workers/${id}`, { method: "DELETE" });
      await loadWorkers();
    } catch (err) {
      feedback($("worker-feedback"), err.message, "err");
    }
  });

  $("sector-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const box = $("sector-feedback");

    try {
      await api("/sectors", {
        method: "POST",
        body: JSON.stringify({ sector: $("sector-name").value.trim() }),
      });

      feedback(box, "Setor adicionado.", "ok");
      e.target.reset();
      await loadSectors();
    } catch (err) {
      feedback(box, err.message, "err");
    }
  });

  $("sectors-list").addEventListener("click", async (e) => {
    const id = e.target.dataset.removeSector;
    if (!id || !confirm("Remover este setor?")) return;

    try {
      await api(`/sectors/${id}`, { method: "DELETE" });
      await loadSectors();
    } catch (err) {
      feedback($("sector-feedback"), err.message, "err");
    }
  });
}

/* ---------------- init ---------------- */

async function init() {
  $("date-picker").value = state.date;
  $("designation-date").value = state.date;

  renderWeekday();
  tickClock();
  setInterval(tickClock, 1000);
  setInterval(() => {
    if (state.date === todayISO()) renderSchedule();
  }, 30000);

  wireEvents();
  renderAdminState();

  try {
    await loadDesignations();
  } catch (err) {
    console.error("Falha ao carregar designações:", err);
  }

  // Trabalhadores e setores só interessam ao admin; falha aqui não quebra a página.
  try {
    await Promise.all([loadWorkers(), loadSectors()]);
  } catch (err) {
    console.error("Falha ao carregar cadastros:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

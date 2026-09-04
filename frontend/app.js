const API_BASE = "/api/v1";

const state = {
  token: localStorage.getItem("token") || null,
  workers: [],
  sectors: [],
  designations: [],
  selectedDate: todayStr(),
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isAdmin() {
  return Boolean(state.token);
}

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    throw new Error("Sessão de administrador expirada.");
  }

  if (!response.ok) {
    let detail = "Erro ao comunicar com o servidor.";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.hidden = false;
  el.className = `msg ${type}`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* ---------- session ---------- */

function clearSession() {
  state.token = null;
  localStorage.removeItem("token");
  applyAdminVisibility();
}

async function login(email, password) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const response = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) throw new Error("E-mail ou senha inválidos.");

  const data = await response.json();
  state.token = data.access_token;
  localStorage.setItem("token", state.token);
}

function applyAdminVisibility() {
  const admin = isAdmin();
  document.getElementById("login-form").hidden = admin;
  document.getElementById("admin-tools").hidden = !admin;
  document.getElementById("admin-toggle-btn").hidden = admin;
  renderDesignations();
}

/* ---------- clock ---------- */

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent =
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function nowAsSeconds() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function timeToSeconds(t) {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

/* ---------- data loading ---------- */

async function loadWorkers() {
  state.workers = await api("/workers");
  renderWorkerOptions();
  renderWorkersDrawer();
}

async function loadSectors() {
  state.sectors = await api("/sectors");
  renderSectorOptions();
  renderSectorsDrawer();
}

async function loadDesignations() {
  state.designations = await api(`/designations?event_date=${state.selectedDate}`);
  renderDesignations();
}

/* ---------- schedule rendering ---------- */

function renderDesignations() {
  const isToday = state.selectedDate === todayStr();
  const now = nowAsSeconds();

  const current = [];
  const next = [];

  state.designations.forEach((d) => {
    if (isToday && timeToSeconds(d.shift_start) <= now && now <= timeToSeconds(d.shift_end)) {
      current.push(d);
    } else if (!isToday || timeToSeconds(d.shift_start) > now) {
      next.push(d);
    }
  });

  renderWorkerList("current-list", "current-empty", current);
  renderWorkerList("next-list", "next-empty", next);
}

function renderWorkerList(listId, emptyId, items) {
  const list = document.getElementById(listId);
  list.innerHTML = "";

  items.forEach((d) => {
    const li = document.createElement("li");
    li.className = "worker-card";
    if (d.substituted) li.classList.add("is-substituted");
    else if (d.confirmed_present) li.classList.add("is-present");

    const statusTag = d.substituted
      ? '<span class="status-tag substituted">Substituído</span>'
      : d.confirmed_present
      ? '<span class="status-tag">Presente</span>'
      : "";

    const actions = isAdmin()
      ? `
        <div class="worker-actions">
          <button type="button" class="action-btn ${d.confirmed_present ? "active" : ""}" data-toggle="present" data-id="${d.id}">Presente</button>
          <button type="button" class="action-btn warn ${d.substituted ? "active" : ""}" data-toggle="substituted" data-id="${d.id}">Substituído</button>
        </div>
      `
      : "";

    li.innerHTML = `
      <div class="worker-info">
        <div class="worker-name">${escapeHtml(d.worker_name)} ${statusTag}</div>
        <div class="worker-meta">${escapeHtml(d.shift_start.slice(0, 5))}–${escapeHtml(d.shift_end.slice(0, 5))}${d.sector ? " · " + escapeHtml(d.sector) : ""}</div>
      </div>
      ${actions}
    `;
    list.appendChild(li);
  });

  document.getElementById(emptyId).hidden = items.length > 0;
}

document.addEventListener("click", async (e) => {
  const toggle = e.target.dataset.toggle;
  if (!toggle) return;

  const id = e.target.dataset.id;
  const designation = state.designations.find((d) => String(d.id) === id);
  if (!designation) return;

  const field = toggle === "present" ? "confirmed_present" : "substituted";
  const payload = { [field]: !designation[field] };

  try {
    const updated = await api(`/designations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    const idx = state.designations.findIndex((d) => d.id === updated.id);
    state.designations[idx] = updated;
    renderDesignations();
  } catch (err) {
    alert(err.message);
  }
});

/* ---------- admin drawers: workers ---------- */

function renderWorkerOptions() {
  const select = document.getElementById("worker-select");
  select.innerHTML = '<option value="" disabled selected>Trabalhador</option>';
  state.workers.forEach((w) => {
    const opt = document.createElement("option");
    opt.value = w.id;
    opt.textContent = w.name;
    select.appendChild(opt);
  });
}

function renderWorkersDrawer() {
  const list = document.getElementById("workers-list");
  list.innerHTML = "";
  state.workers.forEach((w) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${escapeHtml(w.name)} — ${escapeHtml(w.congregation)}</span>
      <button type="button" class="btn-remove" data-delete-worker="${w.id}">Remover</button>
    `;
    list.appendChild(li);
  });
}

function renderSectorOptions() {
  const select = document.getElementById("sector-select");
  select.innerHTML = '<option value="">Sem setor</option>';
  state.sectors.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.sector;
    select.appendChild(opt);
  });
}

function renderSectorsDrawer() {
  const list = document.getElementById("sectors-list");
  list.innerHTML = "";
  state.sectors.forEach((s) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${escapeHtml(s.sector)}</span>
      <button type="button" class="btn-remove" data-delete-sector="${s.id}">Remover</button>
    `;
    list.appendChild(li);
  });
}

/* ---------- drawer open/close ---------- */

function openDrawer(section) {
  document.getElementById("drawer-backdrop").hidden = false;
  document.querySelectorAll(".drawer-section").forEach((el) => (el.hidden = true));
  document.getElementById(`drawer-${section}`).hidden = false;

  const titles = {
    workers: "Trabalhadores",
    sectors: "Setores",
    "new-designation": "Nova designação",
  };
  document.getElementById("drawer-title").textContent = titles[section];
}

function closeDrawer() {
  document.getElementById("drawer-backdrop").hidden = true;
}

/* ---------- event wiring ---------- */

document.getElementById("date-picker").value = state.selectedDate;
document.getElementById("date-picker").addEventListener("change", async (e) => {
  state.selectedDate = e.target.value || todayStr();
  await loadDesignations();
});

document.getElementById("admin-toggle-btn").addEventListener("click", () => {
  document.getElementById("admin-panel").hidden = false;
  document.getElementById("admin-toggle-btn").hidden = true;
  document.getElementById("login-email").focus();
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  try {
    await login(email, password);
    e.target.reset();
    applyAdminVisibility();
  } catch (err) {
    showMsg(errorEl, err.message, "error");
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  document.getElementById("admin-panel").hidden = true;
  document.getElementById("admin-toggle-btn").hidden = false;
  closeDrawer();
});

document.querySelectorAll("[data-open]").forEach((btn) => {
  btn.addEventListener("click", () => openDrawer(btn.dataset.open));
});
document.getElementById("drawer-close").addEventListener("click", closeDrawer);
document.getElementById("drawer-backdrop").addEventListener("click", (e) => {
  if (e.target.id === "drawer-backdrop") closeDrawer();
});

document.getElementById("worker-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("worker-msg");
  const payload = {
    name: document.getElementById("worker-name").value.trim(),
    phone_number: document.getElementById("worker-phone").value.trim(),
    congregation: document.getElementById("worker-congregation").value.trim(),
  };

  try {
    await api("/workers", { method: "POST", body: JSON.stringify(payload) });
    showMsg(msgEl, "Trabalhador adicionado.", "success");
    e.target.reset();
    await loadWorkers();
  } catch (err) {
    showMsg(msgEl, err.message, "error");
  }
});

document.getElementById("workers-list").addEventListener("click", async (e) => {
  const id = e.target.dataset.deleteWorker;
  if (!id) return;
  if (!confirm("Remover este trabalhador?")) return;

  try {
    await api(`/workers/${id}`, { method: "DELETE" });
    await loadWorkers();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("sector-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("sector-msg");
  const payload = { sector: document.getElementById("sector-name").value.trim() };

  try {
    await api("/sectors", { method: "POST", body: JSON.stringify(payload) });
    showMsg(msgEl, "Setor adicionado.", "success");
    e.target.reset();
    await loadSectors();
  } catch (err) {
    showMsg(msgEl, err.message, "error");
  }
});

document.getElementById("sectors-list").addEventListener("click", async (e) => {
  const id = e.target.dataset.deleteSector;
  if (!id) return;
  if (!confirm("Remover este setor?")) return;

  try {
    await api(`/sectors/${id}`, { method: "DELETE" });
    await loadSectors();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("designation-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("designation-msg");
  const sectorId = document.getElementById("sector-select").value;

  const payload = {
    worker_id: Number(document.getElementById("worker-select").value),
    event_date: document.getElementById("event-date").value,
    shift_start: document.getElementById("shift-start").value,
    shift_end: document.getElementById("shift-end").value,
    sector_id: sectorId ? Number(sectorId) : null,
  };

  try {
    await api("/designations", { method: "POST", body: JSON.stringify(payload) });
    showMsg(msgEl, "Designação salva.", "success");
    e.target.reset();
    await loadDesignations();
  } catch (err) {
    showMsg(msgEl, err.message, "error");
  }
});

/* ---------- init ---------- */

async function init() {
  document.getElementById("event-date").value = state.selectedDate;
  applyAdminVisibility();
  updateClock();
  setInterval(updateClock, 1000);

  try {
    await Promise.all([loadWorkers(), loadSectors()]);
    await loadDesignations();
  } catch (err) {
    console.error(err);
  }

  setInterval(() => {
    if (state.selectedDate === todayStr()) renderDesignations();
  }, 30000);
}

init();

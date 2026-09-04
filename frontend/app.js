const API_BASE = "/api/v1";

const state = {
  token: localStorage.getItem("token") || null,
  userEmail: localStorage.getItem("userEmail") || "",
  workers: [],
  sectors: [],
};

const isAdmin = () => Boolean(state.token);

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    const wasAdmin = isAdmin();
    clearSession();
    throw new Error(
      wasAdmin
        ? "Sessão de administrador expirada. Entre novamente."
        : "É preciso estar logado como administrador para fazer isso."
    );
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

function clearSession() {
  state.token = null;
  state.userEmail = "";
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  applyAdminVisibility();
}

function applyAdminVisibility() {
  const admin = isAdmin();

  document.getElementById("admin-badge").hidden = !admin;
  document.getElementById("admin-toggle-btn").hidden = admin;
  document.getElementById("logout-btn").hidden = !admin;

  document.querySelectorAll(".admin-only").forEach((el) => {
    el.hidden = !admin;
  });
  document.querySelectorAll(".admin-only-col").forEach((el) => {
    el.hidden = !admin;
  });

  renderWorkers();
  renderSectors();
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

  if (!response.ok) {
    throw new Error("E-mail ou senha inválidos.");
  }

  const data = await response.json();
  state.token = data.access_token;
  state.userEmail = email;
  localStorage.setItem("token", state.token);
  localStorage.setItem("userEmail", email);
}

function openAdminModal() {
  document.getElementById("admin-modal").hidden = false;
  document.getElementById("login-error").hidden = true;
  document.getElementById("login-email").focus();
}

function closeAdminModal() {
  document.getElementById("admin-modal").hidden = true;
  document.getElementById("login-form").reset();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function renderWorkers() {
  const select = document.getElementById("worker-select");
  select.innerHTML = '<option value="" disabled selected>Selecione um trabalhador</option>';
  state.workers.forEach((worker) => {
    const opt = document.createElement("option");
    opt.value = worker.id;
    opt.textContent = worker.name;
    select.appendChild(opt);
  });

  const body = document.getElementById("workers-body");
  body.innerHTML = "";
  state.workers.forEach((worker) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(worker.name)}</td>
      <td>${escapeHtml(worker.phone_number || "")}</td>
      <td>${escapeHtml(worker.congregation)}</td>
      <td>${isAdmin() ? `<button class="btn-danger" data-delete-worker="${worker.id}">Remover</button>` : ""}</td>
    `;
    body.appendChild(row);
  });

  document.getElementById("workers-empty").hidden = state.workers.length > 0;
}

function renderSectors() {
  const select = document.getElementById("sector-select");
  select.innerHTML = '<option value="">Sem setor</option>';
  state.sectors.forEach((sector) => {
    const opt = document.createElement("option");
    opt.value = sector.id;
    opt.textContent = sector.sector;
    select.appendChild(opt);
  });

  const body = document.getElementById("sectors-body");
  body.innerHTML = "";
  state.sectors.forEach((sector) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(sector.sector)}</td>
      <td>${isAdmin() ? `<button class="btn-danger" data-delete-sector="${sector.id}">Remover</button>` : ""}</td>
    `;
    body.appendChild(row);
  });

  document.getElementById("sectors-empty").hidden = state.sectors.length > 0;
}

async function loadWorkers() {
  state.workers = await api("/workers");
  renderWorkers();
}

async function loadSectors() {
  state.sectors = await api("/sectors");
  renderSectors();
}

async function loadDesignations() {
  const designations = await api("/designations");
  const body = document.getElementById("designations-body");
  body.innerHTML = "";

  designations.forEach((designation) => {
    const worker = state.workers.find((w) => w.id === designation.worker_id);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(worker ? worker.name : `#${designation.worker_id}`)}</td>
      <td>${escapeHtml(designation.sector || "")}</td>
      <td>${escapeHtml(designation.event_date)}</td>
      <td>${escapeHtml(designation.shift_start)}</td>
      <td>${escapeHtml(designation.shift_end)}</td>
    `;
    body.appendChild(row);
  });

  document.getElementById("designations-empty").hidden = designations.length > 0;
}

async function init() {
  applyAdminVisibility();
  try {
    await Promise.all([loadWorkers(), loadSectors()]);
    await loadDesignations();
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("admin-toggle-btn").addEventListener("click", openAdminModal);
document.getElementById("modal-cancel-btn").addEventListener("click", closeAdminModal);
document.getElementById("admin-modal").addEventListener("click", (e) => {
  if (e.target.id === "admin-modal") closeAdminModal();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
});

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  try {
    await login(email, password);
    closeAdminModal();
    applyAdminVisibility();
  } catch (err) {
    showMsg(errorEl, err.message, "error");
  }
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("designation-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("designation-msg");
  const workerId = document.getElementById("worker-select").value;
  const sectorId = document.getElementById("sector-select").value;
  const sector = sectorId
    ? state.sectors.find((s) => String(s.id) === sectorId)?.sector || ""
    : "";

  const payload = {
    worker_id: Number(workerId),
    event_date: document.getElementById("event-date").value,
    shift_start: document.getElementById("shift-start").value,
    shift_end: document.getElementById("shift-end").value,
    sector,
  };

  try {
    await api("/designations", { method: "POST", body: JSON.stringify(payload) });
    showMsg(msgEl, "Designação salva com sucesso.", "success");
    e.target.reset();
    await loadDesignations();
  } catch (err) {
    showMsg(msgEl, err.message, "error");
    applyAdminVisibility();
  }
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
    applyAdminVisibility();
  }
});

document.getElementById("workers-body").addEventListener("click", async (e) => {
  const id = e.target.dataset.deleteWorker;
  if (!id) return;
  if (!confirm("Remover este trabalhador?")) return;

  try {
    await api(`/workers/${id}`, { method: "DELETE" });
    await loadWorkers();
  } catch (err) {
    alert(err.message);
    applyAdminVisibility();
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
    applyAdminVisibility();
  }
});

document.getElementById("sectors-body").addEventListener("click", async (e) => {
  const id = e.target.dataset.deleteSector;
  if (!id) return;
  if (!confirm("Remover este setor?")) return;

  try {
    await api(`/sectors/${id}`, { method: "DELETE" });
    await loadSectors();
  } catch (err) {
    alert(err.message);
    applyAdminVisibility();
  }
});

init();

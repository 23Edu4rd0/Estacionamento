const API_BASE = "/api/v1";

const state = {
  token: localStorage.getItem("token") || null,
  userEmail: localStorage.getItem("userEmail") || "",
  workers: [],
  sectors: [],
};

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");

async function api(path, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    logout();
    throw new Error("Sessão expirada. Faça login novamente.");
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

function logout() {
  state.token = null;
  state.userEmail = "";
  localStorage.removeItem("token");
  localStorage.removeItem("userEmail");
  appScreen.hidden = true;
  loginScreen.hidden = false;
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

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

async function loadWorkers() {
  state.workers = await api("/workers");

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
      <td><button class="btn-danger" data-delete-worker="${worker.id}">Remover</button></td>
    `;
    body.appendChild(row);
  });
}

async function loadSectors() {
  state.sectors = await api("/sectors");

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
      <td><button class="btn-danger" data-delete-sector="${sector.id}">Remover</button></td>
    `;
    body.appendChild(row);
  });
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
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

async function initApp() {
  document.getElementById("user-email").textContent = state.userEmail;
  loginScreen.hidden = true;
  appScreen.hidden = false;

  await Promise.all([loadWorkers(), loadSectors()]);
  await loadDesignations();
}

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.hidden = true;

  try {
    await login(email, password);
    await initApp();
  } catch (err) {
    showMsg(errorEl, err.message, "error");
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

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

document.getElementById("sectors-body").addEventListener("click", async (e) => {
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

if (state.token) {
  initApp().catch(() => logout());
}

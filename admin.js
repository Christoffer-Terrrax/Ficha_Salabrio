const loginPanel = document.getElementById('loginPanel');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('adminLoginForm');
const password = document.getElementById('adminPassword');
const errorBox = document.getElementById('adminError');
const recordsBody = document.getElementById('recordsBody');
const emptyRecords = document.getElementById('emptyRecords');
const recordCount = document.getElementById('recordCount');
const search = document.getElementById('searchRecords');
const modal = document.getElementById('detailModal');
const detailTitle = document.getElementById('detailTitle');
const detailGrid = document.getElementById('detailGrid');
let records = [];

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const formatDateTime = (value) => value ? new Date(value).toLocaleString('es-CL') : '—';

const showLogin = () => { loginPanel.hidden = false; dashboard.hidden = true; };
const showDashboard = () => { loginPanel.hidden = true; dashboard.hidden = false; };

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorBox.textContent = '';
  try {
    const response = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'same-origin', body:JSON.stringify({ password: password.value }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo iniciar sesión.');
    password.value = '';
    showDashboard();
    await loadRecords();
  } catch (error) { errorBox.textContent = error.message; }
});

const loadRecords = async () => {
  const response = await fetch('/api/admin/patients', { credentials:'same-origin' });
  if (response.status === 401) { showLogin(); return; }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las fichas.');
  records = Array.isArray(result.records) ? result.records : [];
  renderRecords();
};

const renderRecords = () => {
  const query = search.value.trim().toLowerCase();
  const filtered = records.filter((item) => `${item.rut} ${item.name}`.toLowerCase().includes(query));
  recordCount.textContent = records.length;
  recordsBody.innerHTML = filtered.map((item) => `<tr><td>${escapeHtml(item.rut)}</td><td>${escapeHtml(item.name || 'Sin nombre')}</td><td>${escapeHtml(item.date || '—')}</td><td>${escapeHtml(formatDateTime(item.updatedAt))}</td><td><button class="table-button" data-rut="${escapeHtml(item.rut)}" type="button">Ver ficha</button></td></tr>`).join('');
  emptyRecords.hidden = filtered.length !== 0;
  if (filtered.length === 0) emptyRecords.textContent = query ? 'No hay coincidencias.' : 'No hay fichas guardadas.';
};

recordsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-rut]');
  if (!button) return;
  try {
    const response = await fetch(`/api/admin/patients/${encodeURIComponent(button.dataset.rut)}`, { credentials:'same-origin' });
    if (!response.ok) throw new Error('No se pudo abrir la ficha.');
    const result = await response.json();
    const record = result.record || {};
    detailTitle.textContent = record.fullName || button.dataset.rut;
    const labels = { document:'RUT', fullName:'Nombre completo', birthDate:'Fecha de nacimiento', age:'Edad', gender:'Género', phone:'Teléfono', address:'Dirección', emergencyName:'Contacto de emergencia', emergencyRelation:'Parentesco', emergencyPhone:'Teléfono de emergencia', insurance:'Previsión', bloodType:'Grupo sanguíneo', weight:'Peso (kg)', height:'Altura (cm)', bmi:'IMC', allergies:'Alergias', medicalHistory:'Antecedentes médicos', medications:'Medicamentos', date:'Fecha de atención', professional:'Profesional / responsable', reason:'Motivo de consulta', symptoms:'Síntomas / evaluación', diagnosis:'Diagnóstico / impresión clínica', treatment:'Tratamiento / indicaciones', notes:'Observaciones' };
    detailGrid.innerHTML = Object.entries(labels).map(([key,label]) => `<div class="detail"><small>${escapeHtml(label)}</small><strong>${escapeHtml(record[key] || '—')}</strong></div>`).join('');
    modal.hidden = false;
  } catch (error) { alert(error.message); }
});

document.getElementById('closeModal').addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', (event) => { if (event.target === modal) modal.hidden = true; });
search.addEventListener('input', renderRecords);
document.getElementById('refreshRecords').addEventListener('click', () => loadRecords().catch((error) => alert(error.message)));
document.getElementById('logoutAdmin').addEventListener('click', async () => { await fetch('/api/admin/logout', { method:'POST', credentials:'same-origin' }); showLogin(); });

loadRecords().then(showDashboard).catch(() => showLogin());

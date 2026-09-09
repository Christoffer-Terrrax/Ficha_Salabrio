const loginPanel = document.getElementById('loginPanel');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('adminLoginForm');
const password = document.getElementById('adminPassword');
const errorBox = document.getElementById('adminError');
const recordsBody = document.getElementById('recordsBody');
const emptyRecords = document.getElementById('emptyRecords');
const recordCount = document.getElementById('recordCount');
const visibleCount = document.getElementById('visibleCount');
const search = document.getElementById('searchRecords');
const clearSearch = document.getElementById('clearSearch');
const modal = document.getElementById('detailModal');
const detailTitle = document.getElementById('detailTitle');
const detailGrid = document.getElementById('detailGrid');
const deleteModal = document.getElementById('deleteModal');
const deletePatientName = document.getElementById('deletePatientName');
const deleteRut = document.getElementById('deleteRut');
const confirmRutInput = document.getElementById('confirmRutInput');
const deleteError = document.getElementById('deleteError');
const confirmDelete = document.getElementById('confirmDelete');
let records = [];
let pendingDeleteRut = '';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
const formatDateTime = (value) => value ? new Date(value).toLocaleString('es-CL') : '—';
const normalizeRutForConfirmation = (value) => String(value || '').toUpperCase().replace(/[^0-9K]/g, '');

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
  if (response.status === 401) { showLogin(); return false; }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las fichas.');
  records = Array.isArray(result.records) ? result.records : [];
  renderRecords();
  return true;
};

const renderRecords = () => {
  const query = search.value.trim().toLowerCase();
  const filtered = records.filter((item) => `${item.rut} ${item.name}`.toLowerCase().includes(query));
  recordCount.textContent = records.length;
  visibleCount.textContent = filtered.length;
  clearSearch.hidden = !query;
  recordsBody.innerHTML = filtered.map((item) => `<tr><td>${escapeHtml(item.rut)}</td><td>${escapeHtml(item.name || 'Sin nombre')}</td><td>${escapeHtml(item.date || '—')}</td><td>${escapeHtml(formatDateTime(item.updatedAt))}</td><td><div class="actions"><button class="table-button" data-rut="${escapeHtml(item.rut)}" type="button">Ver ficha</button><button class="delete-button" data-delete-rut="${escapeHtml(item.rut)}" type="button">Eliminar</button></div></td></tr>`).join('');
  emptyRecords.hidden = filtered.length !== 0;
  if (filtered.length === 0) emptyRecords.textContent = query ? 'No hay coincidencias. Prueba con otro RUT o nombre.' : 'No hay fichas guardadas.';
};

const openDetail = async (rut) => {
  try {
    const response = await fetch(`/api/admin/patients/${encodeURIComponent(rut)}`, { credentials:'same-origin' });
    if (!response.ok) throw new Error('No se pudo abrir la ficha.');
    const result = await response.json();
    const record = result.record || {};
    detailTitle.textContent = record.fullName || rut;
    const labels = { document:'RUT', fullName:'Nombre completo', birthDate:'Fecha de nacimiento', age:'Edad', gender:'Género', phone:'Teléfono', address:'Dirección', emergencyName:'Contacto de emergencia', emergencyRelation:'Parentesco', emergencyPhone:'Teléfono de emergencia', insurance:'Previsión', bloodType:'Grupo sanguíneo', weight:'Peso (kg)', height:'Altura (cm)', bmi:'IMC', allergies:'Alergias', medicalHistory:'Antecedentes médicos', medications:'Medicamentos', date:'Fecha de atención', professional:'Profesional / responsable', reason:'Motivo de consulta', symptoms:'Síntomas / evaluación', diagnosis:'Diagnóstico / impresión clínica', treatment:'Tratamiento / indicaciones', notes:'Observaciones' };
    detailGrid.innerHTML = Object.entries(labels).map(([key,label]) => `<div class="detail"><small>${escapeHtml(label)}</small><strong>${escapeHtml(record[key] || '—')}</strong></div>`).join('');
    modal.hidden = false;
  } catch (error) { alert(error.message); }
};

const openDelete = (rut) => {
  const item = records.find((record) => normalizeRutForConfirmation(record.rut) === normalizeRutForConfirmation(rut));
  if (!item) return;
  pendingDeleteRut = item.rut;
  deletePatientName.textContent = item.name || 'Sin nombre';
  deleteRut.textContent = item.rut || '—';
  confirmRutInput.value = '';
  deleteError.textContent = '';
  confirmDelete.disabled = true;
  deleteModal.hidden = false;
  setTimeout(() => confirmRutInput.focus(), 0);
};

const closeDelete = () => { deleteModal.hidden = true; pendingDeleteRut = ''; confirmRutInput.value = ''; deleteError.textContent = ''; };

recordsBody.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-rut]');
  const deleteButton = event.target.closest('[data-delete-rut]');
  if (viewButton) openDetail(viewButton.dataset.rut);
  if (deleteButton) openDelete(deleteButton.dataset.deleteRut);
});

document.getElementById('closeModal').addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', (event) => { if (event.target === modal) modal.hidden = true; });
search.addEventListener('input', renderRecords);
clearSearch.addEventListener('click', () => { search.value = ''; search.focus(); renderRecords(); });
document.getElementById('refreshRecords').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Actualizando...';
  try { await loadRecords(); } catch (error) { alert(error.message); }
  button.disabled = false;
  button.textContent = 'Actualizar registros';
});

document.getElementById('logoutAdmin').addEventListener('click', async () => { await fetch('/api/admin/logout', { method:'POST', credentials:'same-origin' }); closeDelete(); showLogin(); });

confirmRutInput.addEventListener('input', () => {
  confirmDelete.disabled = normalizeRutForConfirmation(confirmRutInput.value) !== normalizeRutForConfirmation(pendingDeleteRut);
  deleteError.textContent = '';
});

document.getElementById('cancelDelete').addEventListener('click', closeDelete);
document.getElementById('closeDeleteModal').addEventListener('click', closeDelete);
confirmDelete.addEventListener('click', async () => {
  if (confirmDelete.disabled || !pendingDeleteRut) return;
  confirmDelete.disabled = true;
  confirmDelete.textContent = 'Eliminando...';
  deleteError.textContent = '';
  try {
    const response = await fetch(`/api/admin/patients/${encodeURIComponent(pendingDeleteRut)}`, { method:'DELETE', credentials:'same-origin' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la ficha.');
    closeDelete();
    await loadRecords();
  } catch (error) {
    deleteError.textContent = error.message;
    confirmDelete.disabled = false;
  }
  confirmDelete.textContent = 'Eliminar ficha definitivamente';
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!deleteModal.hidden) closeDelete();
  else if (!modal.hidden) modal.hidden = true;
});

loadRecords().then((authenticated) => { if (authenticated) showDashboard(); }).catch(() => showLogin());

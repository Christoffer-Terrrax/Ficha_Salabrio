const STORAGE_PREFIX = 'fichaSalabrio:';
const SESSION_KEY = 'fichaSalabrioSession';

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const loginRut = document.getElementById('loginRut');
const loginError = document.getElementById('loginError');
const medicalForm = document.getElementById('medicalForm');
const summaryCard = document.getElementById('summaryCard');
const resetButton = document.getElementById('resetButton');
const logoutButton = document.getElementById('logoutButton');
const sessionRut = document.getElementById('sessionRut');
const documentField = document.getElementById('document');
const successMessage = document.getElementById('successMessage');

const normalizeRut = (value) => {
  const clean = String(value || '').toUpperCase().replace(/[^0-9K]/g, '');
  if (clean.length < 2) return '';
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
};

const isValidRut = (value) => {
  const clean = String(value || '').toUpperCase().replace(/[^0-9K]/g, '');
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;

  const body = clean.slice(0, -1);
  const checkDigit = clean.slice(-1);
  let multiplier = 2;
  let sum = 0;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return expected === checkDigit;
};

const storageKeyFor = (rut) => `${STORAGE_PREFIX}${rut.replace(/[^0-9K]/g, '')}`;

const defaultDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const showLoginError = (message) => {
  loginError.textContent = message;
  loginError.hidden = false;
};

const clearLoginError = () => {
  loginError.textContent = '';
  loginError.hidden = true;
};

const renderSummary = (data) => {
  if (!data) {
    summaryCard.innerHTML = '<p class="muted">Aún no se ha guardado ninguna ficha.</p>';
    return;
  }

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));

  summaryCard.innerHTML = `
    <div class="summary-status">Ficha guardada</div>
    <h3>${escapeHtml(data.fullName || 'Paciente sin nombre')}</h3>
    <p><strong>Edad:</strong> ${escapeHtml(data.age || 'No indicada')}</p>
    <p><strong>RUT:</strong> ${escapeHtml(data.document || 'No indicado')}</p>
    <p><strong>Fecha:</strong> ${escapeHtml(data.date || 'Sin fecha')}</p>
    <p><strong>Motivo:</strong> ${escapeHtml(data.reason || 'No indicado')}</p>
    <p><strong>Diagnóstico:</strong> ${escapeHtml(data.diagnosis || 'No indicado')}</p>
    <p><strong>Síntomas:</strong> ${escapeHtml(data.symptoms || 'No indicados')}</p>
  `;
};

const getSessionRut = () => sessionStorage.getItem(SESSION_KEY);

const loadSavedData = (rut) => {
  const saved = localStorage.getItem(storageKeyFor(rut));
  documentField.value = rut;

  if (!saved) {
    medicalForm.reset();
    documentField.value = rut;
    document.getElementById('date').value = defaultDate();
    renderSummary(null);
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([key, value]) => {
      const field = document.getElementById(key);
      if (field && key !== 'document') field.value = value;
    });
    documentField.value = rut;
    renderSummary(parsed);
  } catch (error) {
    console.error('Error reading saved record:', error);
    medicalForm.reset();
    documentField.value = rut;
    document.getElementById('date').value = defaultDate();
    renderSummary(null);
  }
};

const enterApp = (rut) => {
  const normalized = normalizeRut(rut);
  sessionStorage.setItem(SESSION_KEY, normalized);
  sessionRut.textContent = normalized;
  loginView.hidden = true;
  appView.hidden = false;
  clearLoginError();
  loadSavedData(normalized);
};

const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
  medicalForm.reset();
  renderSummary(null);
  successMessage.hidden = true;
  appView.hidden = true;
  loginView.hidden = false;
  loginRut.value = '';
  loginRut.focus();
};

loginRut.addEventListener('input', () => {
  const value = loginRut.value.replace(/[^0-9kK.-]/g, '').toUpperCase();
  loginRut.value = value;
  clearLoginError();
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const rut = normalizeRut(loginRut.value);

  if (!isValidRut(rut)) {
    showLoginError('Ingresa un RUT chileno válido.');
    return;
  }

  enterApp(rut);
});

medicalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const rut = getSessionRut();

  if (!rut) {
    logout();
    return;
  }

  const formData = Object.fromEntries(new FormData(medicalForm).entries());
  formData.document = rut;
  localStorage.setItem(storageKeyFor(rut), JSON.stringify(formData));
  renderSummary(formData);

  successMessage.hidden = false;
  window.setTimeout(() => {
    successMessage.hidden = true;
  }, 3500);
});

resetButton.addEventListener('click', () => {
  const rut = getSessionRut();
  if (!rut) {
    logout();
    return;
  }

  medicalForm.reset();
  documentField.value = rut;
  document.getElementById('date').value = defaultDate();
  localStorage.removeItem(storageKeyFor(rut));
  renderSummary(null);
  successMessage.hidden = true;
});

logoutButton.addEventListener('click', logout);

const existingSession = getSessionRut();
if (existingSession && isValidRut(existingSession)) {
  enterApp(existingSession);
} else {
  sessionStorage.removeItem(SESSION_KEY);
  loginView.hidden = false;
  appView.hidden = true;
}

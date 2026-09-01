const SESSION_KEY = 'fichaSalabrioSession';
const API_BASE = '/api';

const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');
const loginForm = document.getElementById('loginForm');
const loginRut = document.getElementById('loginRut');
const loginError = document.getElementById('loginError');
const medicalForm = document.getElementById('medicalForm');
const sessionRut = document.getElementById('sessionRut');
const documentRut = document.getElementById('documentRut');
const documentField = document.getElementById('document');
const statusMessage = document.getElementById('statusMessage');
const attachment = document.getElementById('attachment');
const attachmentInfo = document.getElementById('attachmentInfo');
const attachmentPrintSection = document.getElementById('attachmentPrintSection');
const attachmentPrintName = document.getElementById('attachmentPrintName');
const documentDate = document.getElementById('documentDate');
const weightField = document.getElementById('weight');
const heightField = document.getElementById('height');
const bmiField = document.getElementById('bmi');
const bmiStatus = document.getElementById('bmiStatus');

const normalizeRut = (value) => {
  const clean = String(value || '').toUpperCase().replace(/[^0-9K]/g, '');
  if (clean.length < 2) return '';
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
};

const formatRut = (value) => {
  const clean = String(value || '').toUpperCase().replace(/[^0-9K]/g, '').slice(0, 9);
  if (!clean) return '';
  if (clean.length === 1) return clean;
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${verifier}`;
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

const calculateBmi = () => {
  const weight = Number.parseFloat(weightField.value);
  const heightCm = Number.parseFloat(heightField.value);

  if (!Number.isFinite(weight) || !Number.isFinite(heightCm) || weight <= 0 || heightCm <= 0) {
    bmiField.value = '';
    bmiStatus.textContent = '';
    return '';
  }

  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  const rounded = bmi.toFixed(1);
  bmiField.value = rounded;

  if (bmi < 18.5) {
    bmiStatus.textContent = 'IMC calculado: por debajo de 18,5.';
  } else if (bmi < 25) {
    bmiStatus.textContent = 'IMC calculado: rango de referencia adulto 18,5–24,9.';
  } else if (bmi < 30) {
    bmiStatus.textContent = 'IMC calculado: 25,0–29,9.';
  } else {
    bmiStatus.textContent = 'IMC calculado: 30,0 o superior.';
  }

  return rounded;
};

const setStatus = (message, type = 'success') => {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type} no-print`;
  statusMessage.hidden = false;
};

const clearStatus = () => {
  statusMessage.hidden = true;
  statusMessage.textContent = '';
};

const setLoginError = (message) => {
  loginError.textContent = message;
  loginError.hidden = !message;
};

const getSessionRut = () => sessionStorage.getItem(SESSION_KEY);

const setFieldValues = (data = {}) => {
  const fields = medicalForm.querySelectorAll('input[name], textarea[name], select[name]');
  fields.forEach((field) => {
    if (field.name === 'document' || field.name === 'attachment' || field.name === 'bmi') return;
    field.value = data[field.name] ?? '';
  });
  calculateBmi();
};

const getFormData = () => {
  const data = {};
  medicalForm.querySelectorAll('input[name], textarea[name], select[name]').forEach((field) => {
    if (field.name !== 'attachment') data[field.name] = field.value;
  });
  data.bmi = calculateBmi();
  return data;
};

const setDefaultDate = () => {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  document.getElementById('date').value = date;
  documentDate.textContent = new Date(date + 'T12:00:00').toLocaleDateString('es-CL');
};

const clearForm = (rut) => {
  medicalForm.reset();
  documentField.value = rut;
  setDefaultDate();
  attachment.value = '';
  attachmentInfo.textContent = 'No hay documento seleccionado.';
  attachmentPrintSection.hidden = true;
  attachmentPrintName.textContent = '';
  calculateBmi();
};

const loadRecord = async (rut) => {
  clearStatus();
  clearForm(rut);
  try {
    const response = await fetch(`${API_BASE}/patients/${encodeURIComponent(rut)}`);
    if (response.status === 404) return;
    if (!response.ok) throw new Error('No se pudo consultar la ficha.');
    const data = await response.json();
    setFieldValues(data.record || {});
    documentField.value = rut;
    if (data.attachment?.name) {
      attachmentInfo.textContent = `Documento guardado: ${data.attachment.name}`;
      attachmentPrintSection.hidden = false;
      attachmentPrintName.textContent = data.attachment.name;
    }
  } catch (error) {
    console.error(error);
    setStatus('No fue posible consultar el registro. Puedes seguir completando la ficha y reintentar.', 'error');
  }
};

const enterApp = async (rut) => {
  sessionStorage.setItem(SESSION_KEY, rut);
  sessionRut.textContent = rut;
  documentRut.textContent = rut;
  documentField.value = rut;
  loginView.hidden = true;
  appView.hidden = false;
  await loadRecord(rut);
};

const logout = () => {
  sessionStorage.removeItem(SESSION_KEY);
  appView.hidden = true;
  loginView.hidden = false;
  loginRut.value = '';
  setLoginError('');
  clearStatus();
  loginRut.focus();
};

loginRut.addEventListener('input', () => {
  loginRut.value = formatRut(loginRut.value);
  setLoginError('');
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const rut = normalizeRut(loginRut.value);
  if (!isValidRut(rut)) {
    setLoginError('Ingresa un RUT chileno válido para acceder a la ficha.');
    return;
  }
  await enterApp(rut);
});

[weightField, heightField].forEach((field) => {
  field.addEventListener('input', calculateBmi);
});

attachment.addEventListener('change', () => {
  const file = attachment.files[0];
  if (!file) {
    attachmentInfo.textContent = 'No hay documento seleccionado.';
    return;
  }
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    attachment.value = '';
    attachmentInfo.textContent = 'Formato no permitido. Usa PDF, JPG, PNG o WEBP.';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    attachment.value = '';
    attachmentInfo.textContent = 'El archivo supera el máximo de 5 MB.';
    return;
  }
  attachmentInfo.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  attachmentPrintSection.hidden = false;
  attachmentPrintName.textContent = file.name;
});

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

document.getElementById('saveButton').addEventListener('click', async () => {
  const rut = getSessionRut();
  if (!rut) return logout();

  const data = getFormData();
  data.document = rut;

  if (!data.fullName || !data.birthDate || !data.age || !data.date) {
    setStatus('Completa nombre, fecha de nacimiento, edad y fecha de atención.', 'error');
    return;
  }

  const file = attachment.files[0];
  const payload = { record: data };
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      setStatus('El documento supera el máximo permitido de 5 MB.', 'error');
      return;
    }
    payload.attachment = {
      name: file.name,
      type: file.type,
      size: file.size,
      data: await fileToDataUrl(file)
    };
  }

  const saveButton = document.getElementById('saveButton');
  saveButton.disabled = true;
  saveButton.textContent = 'Guardando...';

  try {
    const response = await fetch(`${API_BASE}/patients/${encodeURIComponent(rut)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar la ficha.');
    setStatus('Ficha guardada correctamente en el servidor.');
  } catch (error) {
    console.error(error);
    setStatus(error.message || 'Ocurrió un error al guardar.', 'error');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Guardar ficha';
  }
});

document.getElementById('clearButton').addEventListener('click', () => {
  const rut = getSessionRut();
  if (!rut) return logout();
  clearForm(rut);
  setStatus('Formulario limpiado. Recuerda guardar si quieres conservar los cambios.', 'info');
});

document.getElementById('logoutButton').addEventListener('click', logout);

document.getElementById('printButton').addEventListener('click', () => {
  window.print();
});

document.getElementById('pdfButton').addEventListener('click', async () => {
  const element = document.getElementById('printableFicha');
  if (typeof html2pdf === 'undefined') {
    window.print();
    return;
  }

  setStatus('Generando PDF...', 'info');
  document.body.classList.add('pdf-exporting');
  try {
    await html2pdf().set({
      margin: 8,
      filename: `FichaSalibrio_${getSessionRut()}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(element).save();
    setStatus('PDF generado correctamente.');
  } catch (error) {
    console.error(error);
    setStatus('No fue posible generar el PDF.', 'error');
  } finally {
    document.body.classList.remove('pdf-exporting');
  }
});

const existingSession = getSessionRut();
if (existingSession && isValidRut(existingSession)) {
  enterApp(existingSession);
} else {
  sessionStorage.removeItem(SESSION_KEY);
}

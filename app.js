const STORAGE_KEY = 'fichaSalabrio';

const form = document.getElementById('medicalForm');
const summaryCard = document.getElementById('summaryCard');
const resetButton = document.getElementById('resetButton');

const defaultDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const renderSummary = (data) => {
  if (!data) {
    summaryCard.innerHTML = '<p class="muted">Aún no se ha guardado ninguna ficha.</p>';
    return;
  }

  const date = data.date || 'Sin fecha';
  summaryCard.innerHTML = `
    <h3>${data.fullName || 'Paciente sin nombre'}</h3>
    <p><strong>Edad:</strong> ${data.age || 'No indicada'}</p>
    <p><strong>Documento:</strong> ${data.document || 'No indicado'}</p>
    <p><strong>Fecha:</strong> ${date}</p>
    <p><strong>Motivo:</strong> ${data.reason || 'No indicado'}</p>
    <p><strong>Diagnóstico:</strong> ${data.diagnosis || 'No indicado'}</p>
    <p><strong>Síntomas:</strong> ${data.symptoms || 'No indicados'}</p>
  `;
};

const loadSavedData = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    document.getElementById('date').value = defaultDate();
    renderSummary(null);
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    Object.entries(parsed).forEach(([key, value]) => {
      const field = document.getElementById(key);
      if (field) field.value = value;
    });
    renderSummary(parsed);
  } catch (error) {
    console.error('Error reading saved record:', error);
    document.getElementById('date').value = defaultDate();
    renderSummary(null);
  }
};

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = Object.fromEntries(new FormData(form).entries());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  renderSummary(formData);

  const existingMessage = document.querySelector('.success-message');
  if (existingMessage) {
    existingMessage.remove();
  }

  const success = document.createElement('span');
  success.className = 'success-message';
  success.textContent = 'Ficha guardada correctamente';
  form.appendChild(success);
});

resetButton.addEventListener('click', () => {
  form.reset();
  document.getElementById('date').value = defaultDate();
  localStorage.removeItem(STORAGE_KEY);
  renderSummary(null);

  const message = document.querySelector('.success-message');
  if (message) {
    message.remove();
  }
});

loadSavedData();

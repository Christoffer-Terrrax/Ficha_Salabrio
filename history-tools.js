(() => {
  const escape = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
  const dateLabel = (value) => {
    if (!value) return 'consulta';
    const d = new Date(`${value}T12:00:00`);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('es-CL').replace(/\//g, '-');
  };
  const getRut = () => sessionStorage.getItem('fichaSalabrioSession') || 'paciente';
  const downloadHistoryPdf = async (item, index) => {
    if (typeof html2pdf === 'undefined') {
      alert('El generador PDF no está disponible.');
      return;
    }
    const r = item?.record || {};
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-100000px;top:0;width:190mm;box-sizing:border-box;background:#fff;color:#18212b;padding:10mm;font-family:Arial,sans-serif;';
    wrapper.innerHTML = `<div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #d04010;padding-bottom:10px;margin-bottom:14px"><img src="logo-montemaria.png?v=6" style="width:100px;height:auto;max-height:70px;object-fit:contain" onerror="this.onerror=null;this.src='logo-montemaria-fixed.svg?v=3'"><div><h1 style="margin:0;font-size:22px">FichaSalabrio</h1><p style="margin:4px 0 0;font-size:12px">Registro de consulta médica</p></div></div><h2 style="font-size:18px;margin:0 0 12px">Consulta del ${escape(dateLabel(r.date))}</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px"><p><b>Paciente:</b> ${escape(r.fullName || '—')}</p><p><b>RUT:</b> ${escape(r.document || getRut())}</p><p><b>Fecha de nacimiento:</b> ${escape(r.birthDate || '—')}</p><p><b>Edad:</b> ${escape(r.age || '—')}</p><p><b>Peso:</b> ${escape(r.weight || '—')} kg</p><p><b>Altura:</b> ${escape(r.height || '—')} cm</p><p><b>IMC:</b> ${escape(r.bmi || '—')}</p><p><b>Profesional:</b> ${escape(r.professional || '—')}</p></div><hr style="border:0;border-top:1px solid #ddd;margin:12px 0"><p><b>Motivo:</b> ${escape(r.reason || '—')}</p><p><b>Síntomas / evaluación:</b> ${escape(r.symptoms || '—')}</p><p><b>Diagnóstico:</b> ${escape(r.diagnosis || '—')}</p><p><b>Tratamiento / indicaciones:</b> ${escape(r.treatment || '—')}</p><p><b>Observaciones:</b> ${escape(r.notes || '—')}</p><p style="margin-top:20px;font-size:9px;color:#68737d">Documento generado desde FichaSalabrio · Registro histórico ${index + 1}</p>`;
    document.body.appendChild(wrapper);
    try {
      await html2pdf().set({ margin:0, filename:`FichaSalabrio_Historial_${getRut()}_${r.date || 'consulta'}.pdf`, image:{type:'jpeg',quality:.95}, html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff'}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}, pagebreak:{mode:['css','legacy']} }).from(wrapper).save();
    } finally {
      wrapper.remove();
    }
  };
  window.downloadHistoryPdf = downloadHistoryPdf;

  const enhanceHistory = () => {
    const list = document.getElementById('historyList');
    if (!list) return;
    list.querySelectorAll('.history-item').forEach((item, index) => {
      if (item.querySelector('.history-download')) return;
      const body = item.querySelector('.history-body');
      if (!body) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'history-download';
      button.textContent = 'Descargar PDF';
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const listItems = Array.from(list.querySelectorAll('.history-item'));
        const source = window.__fichaSalabrioHistory?.[index];
        if (!source) return;
        button.disabled = true;
        button.textContent = 'Generando...';
        try { await downloadHistoryPdf(source, index); } finally { button.disabled = false; button.textContent = 'Descargar PDF'; }
      });
      body.prepend(button);
    });
  };

  const captureHistory = () => {
    const original = window.renderHistory;
    if (typeof original === 'function' && !original.__historyWrapped) {
      const wrapped = (history) => {
        window.__fichaSalabrioHistory = Array.isArray(history) ? [...history] : [];
        const result = original(history);
        setTimeout(enhanceHistory, 0);
        return result;
      };
      wrapped.__historyWrapped = true;
      window.renderHistory = wrapped;
    }
    enhanceHistory();
  };

  const observer = new MutationObserver(enhanceHistory);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  const timer = setInterval(captureHistory, 250);
  setTimeout(() => clearInterval(timer), 10000);
  document.addEventListener('DOMContentLoaded', captureHistory);
})();

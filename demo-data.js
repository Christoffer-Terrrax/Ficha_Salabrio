(() => {
  const makeRecord = (name, rut, birthDate, age, gender, date, reason, symptoms, diagnosis, treatment, weight, height) => ({
    fullName:name,birthDate,age:String(age),document:rut,gender,phone:'',address:'REGISTRO DEMO · DATOS FICTICIOS',
    emergencyName:'Contacto DEMO',emergencyRelation:'Prueba',emergencyPhone:'',insurance:'Fonasa',bloodType:'O+',
    weight:String(weight),height:String(height),bmi:(Number(weight)/Math.pow(Number(height)/100,2)).toFixed(1),allergies:'Ninguna',
    medicalHistory:'Datos completamente ficticios para demostración.',medications:'',date,professional:'Equipo DEMO',reason,symptoms,diagnosis,treatment,
    notes:'Paciente de demostración. No corresponde a una persona real.'
  });
  const raw = [
    ['Valentina Demo','12.345.678-5','2009-04-18',17,'Femenino','2026-09-04','Control preventivo escolar','Sin síntomas relevantes.','Control preventivo normal.','Mantener controles periódicos.',58,162,['2026-05-12','Control general','Sin síntomas relevantes.','Sin hallazgos relevantes.','Observación y control.'],['2026-07-16','Revisión preventiva','Molestias respiratorias leves.','Cuadro respiratorio leve de resolución espontánea.','Hidratación y control si persiste.']],
    ['Tomás Prueba','98.765.432-5','2009-02-03',17,'Masculino','2026-09-03','Control deportivo','Sin síntomas actuales.','Apto para actividad habitual según registro DEMO.','Mantener hidratación y pausas.',70,174,['2026-04-28','Consulta preventiva','Sin síntomas.','Sin hallazgos relevantes.','Seguimiento habitual.'],['2026-08-05','Control post actividad física','Molestia muscular leve.','Sobrecarga muscular leve en registro DEMO.','Reposo relativo y observación.']],
    ['Matías Test','76.543.210-3','2010-11-22',15,'Prefiere no indicar','2026-09-02','Revisión de antecedentes','Sin síntomas actuales.','Control de antecedentes ficticios.','Continuar seguimiento institucional.',62,168,['2026-05-21','Control general','Sin síntomas.','Sin hallazgos relevantes.','Control preventivo.'],['2026-07-30','Consulta de seguimiento','Molestia ocasional.','Seguimiento ficticio.','Observación y control.']],
    ['Sofía Ejemplo','11.223.344-K','2010-01-14',16,'Femenino','2026-09-01','Control general','Sin síntomas relevantes.','Control normal DEMO.','Seguimiento preventivo.',54,158,['2026-04-10','Control escolar','Cansancio leve.','Sin hallazgos relevantes.','Descanso y seguimiento.'],['2026-06-18','Revisión','Sin síntomas.','Control preventivo DEMO.','Mantener controles.']],
    ['Benjamín Demo','22.334.455-0','2008-12-02',17,'Masculino','2026-08-29','Evaluación preventiva','Sin síntomas actuales.','Evaluación preventiva sin hallazgos DEMO.','Continuar controles.',73,179,['2026-03-20','Control inicial','Sin síntomas.','Sin hallazgos.','Seguimiento.'],['2026-06-03','Control de rutina','Molestia leve transitoria.','Sin hallazgos relevantes.','Observación.']],
    ['Antonia Prueba','33.445.566-1','2009-09-27',16,'Femenino','2026-08-27','Consulta preventiva','Dolor de cabeza leve.','Registro DEMO de cefalea ocasional.','Hidratación y observación.',57,164,['2026-04-22','Control general','Sin síntomas.','Sin hallazgos.','Control habitual.'],['2026-07-08','Seguimiento','Cefalea ocasional.','Episodio leve de seguimiento DEMO.','Observación y control.']],
    ['Diego Test','44.556.677-2','2009-07-11',17,'Masculino','2026-08-25','Control de salud','Sin síntomas relevantes.','Control preventivo normal DEMO.','Continuar controles.',68,172,['2026-05-02','Consulta general','Sin síntomas.','Sin hallazgos.','Seguimiento habitual.'],['2026-06-26','Revisión preventiva','Molestia pasajera.','Sin hallazgos relevantes.','Observación.']],
    ['Camila Demo','55.667.788-3','2010-03-19',16,'Femenino','2026-08-22','Revisión de antecedentes','Sin síntomas actuales.','Antecedentes revisados en DEMO.','Mantener seguimiento institucional.',60,166,['2026-03-14','Control inicial','Sin síntomas.','Sin hallazgos.','Control preventivo.'],['2026-06-12','Seguimiento','Sin síntomas.','Control normal DEMO.','Continuar seguimiento.']],
    ['Joaquín Ejemplo','66.778.899-4','2009-11-05',16,'Masculino','2026-08-20','Control preventivo','Molestia muscular leve.','Sobrecarga leve registrada en DEMO.','Reposo relativo y observación.',66,176,['2026-04-05','Consulta general','Sin síntomas.','Sin hallazgos.','Seguimiento.'],['2026-07-01','Control deportivo','Molestia muscular leve.','Sobrecarga muscular leve DEMO.','Reposo relativo.']],
    ['Florencia Prueba','77.889.900-0','2010-06-24',16,'Femenino','2026-08-18','Evaluación escolar','Sin síntomas relevantes.','Evaluación preventiva DEMO.','Mantener controles periódicos.',55,160,['2026-02-27','Control inicial','Sin síntomas.','Sin hallazgos.','Seguimiento habitual.'],['2026-05-30','Revisión preventiva','Molestia leve.','Sin hallazgos relevantes.','Observación y control.']]
  ];
  const demos = {};
  raw.forEach((p) => {
    const [name,rut,birthDate,age,gender,date,reason,symptoms,diagnosis,treatment,weight,height,h1,h2] = p;
    const history = [
      makeRecord(name,rut,birthDate,age,gender,h1[0],h1[1],h1[2],h1[3],h1[4],weight,height),
      makeRecord(name,rut,birthDate,age,gender,h2[0],h2[1],h2[2],h2[3],h2[4],weight,height)
    ].map((record,i) => ({id:`demo-${rut}-${i+1}`,savedAt:`${record.date}T14:00:00.000Z`,record}));
    demos[rut.replace(/[^0-9K]/g,'')] = {
      record:makeRecord(name,rut,birthDate,age,gender,date,reason,symptoms,diagnosis,treatment,weight,height),
      history,
      attachment:null,
      updatedAt:`${date}T14:00:00.000Z`,
      isDemo:true
    };
  });

  const deleted = new Set();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const jsonResponse = (payload, status=200) => new Response(JSON.stringify(payload), {status,headers:{'Content-Type':'application/json'}});
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init={}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    const patientMatch = url.match(/\/api\/patients\/([^/?#]+)/);
    const adminMatch = url.match(/\/api\/admin\/patients\/([^/?#]+)/);
    const adminList = /\/api\/admin\/patients(?:\?|$)/.test(url) && !adminMatch;

    if (patientMatch) {
      const key = decodeURIComponent(patientMatch[1]).toUpperCase().replace(/[^0-9K]/g,'');
      if (demos[key] && !deleted.has(key)) {
        if (method === 'GET') return jsonResponse(clone(demos[key]));
        if (method === 'PUT') {
          const payload = JSON.parse(init.body || '{}');
          const current = demos[key];
          if (current.record) current.history.push({id:`demo-${Date.now()}`,savedAt:new Date().toISOString(),record:clone(current.record)});
          current.record = clone(payload.record || current.record);
          current.record.document = current.record.document || demos[key].record.document;
          if (payload.attachment) current.attachment = clone(payload.attachment);
          current.updatedAt = new Date().toISOString();
          current.history = current.history.slice(-50);
          return jsonResponse({ok:true,message:'Consulta DEMO guardada. La consulta anterior quedó en el historial.',history:clone(current.history)});
        }
      }
    }

    if (adminList && method === 'GET') {
      const response = await originalFetch(input, init);
      if (!response.ok) return response;
      const base = await response.json();
      const demoRecords = Object.entries(demos).filter(([key])=>!deleted.has(key)).map(([key,item])=>({rut:item.record.document,name:item.record.fullName,date:item.record.date,updatedAt:item.updatedAt,consultationCount:1+item.history.length,isDemo:true}));
      const existingKeys = new Set((base.records||[]).map(item=>String(item.rut||'').toUpperCase().replace(/[^0-9K]/g,'')));
      return jsonResponse({records:[...(base.records||[]),...demoRecords.filter(item=>!existingKeys.has(keyFromRut(item.rut)))]});
    }

    if (adminMatch) {
      const key = decodeURIComponent(adminMatch[1]).toUpperCase().replace(/[^0-9K]/g,'');
      if (demos[key] && !deleted.has(key)) {
        if (method === 'GET') return jsonResponse(clone(demos[key]));
        if (method === 'DELETE') { deleted.add(key); return jsonResponse({ok:true,message:'Ficha DEMO eliminada de la sesión.'}); }
      }
    }
    return originalFetch(input, init);
  };
  const keyFromRut = (rut) => String(rut||'').toUpperCase().replace(/[^0-9K]/g,'');
  window.FICHA_DEMO_PATIENTS = demos;
})();

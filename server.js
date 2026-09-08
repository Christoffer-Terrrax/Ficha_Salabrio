const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'patients.json');
const MAX_BODY = 8 * 1024 * 1024;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const adminSessions = new Map();

const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json; charset=utf-8', '.ico':'image/x-icon' };

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}', 'utf8');

const readDb = () => { try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}'); } catch { return {}; } };
const writeDb = (db) => { const temp = `${DB_FILE}.${crypto.randomUUID()}.tmp`; fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8'); fs.renameSync(temp, DB_FILE); };
const normalizeRut = (value) => { const clean = String(value || '').toUpperCase().replace(/[^0-9K]/g, ''); return clean.length >= 2 ? `${clean.slice(0, -1)}-${clean.slice(-1)}` : ''; };
const rutKey = (rut) => normalizeRut(rut).replace('-', '');
const send = (res, status, payload, headers = {}) => { const body = typeof payload === 'string' ? payload : JSON.stringify(payload); res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', ...headers }); res.end(body); };

const readJson = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (chunk) => { raw += chunk; if (Buffer.byteLength(raw) > MAX_BODY) { reject(new Error('PAYLOAD_TOO_LARGE')); req.destroy(); } });
  req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('INVALID_JSON')); } });
  req.on('error', reject);
});

const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
const isAdmin = (req) => {
  const token = parseCookies(req.headers.cookie || '').admin_session;
  const expiry = token ? adminSessions.get(token) : 0;
  if (!expiry || expiry <= Date.now()) { if (token) adminSessions.delete(token); return false; }
  return true;
};

const sanitizeRecord = (record = {}) => {
  const fields = ['fullName','birthDate','age','document','gender','phone','address','emergencyName','emergencyRelation','emergencyPhone','insurance','bloodType','weight','height','bmi','allergies','medicalHistory','medications','date','professional','reason','symptoms','diagnosis','treatment','notes'];
  return fields.reduce((out, key) => { const value = record[key]; out[key] = typeof value === 'string' ? value.trim().slice(0, 5000) : String(value ?? '').slice(0, 200); return out; }, {});
};
const validAttachment = (attachment) => { if (!attachment) return true; const allowed = new Set(['application/pdf','image/jpeg','image/png','image/webp']); return allowed.has(attachment.type) && Number(attachment.size) <= 5 * 1024 * 1024 && typeof attachment.data === 'string'; };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return send(res, 200, { status:'ok', service:'FichaSalabrio' });

  if (url.pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      if (!ADMIN_PASSWORD) return send(res, 503, { error:'El acceso administrador aún no está configurado en Railway.' });
      const payload = await readJson(req); const supplied = String(payload.password || '');
      const a = Buffer.from(supplied); const b = Buffer.from(ADMIN_PASSWORD);
      const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!valid) return send(res, 401, { error:'Contraseña incorrecta.' });
      const token = crypto.randomBytes(32).toString('hex');
      adminSessions.set(token, Date.now() + 8 * 60 * 60 * 1000);
      return send(res, 200, { ok:true }, { 'Set-Cookie':`admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800` });
    } catch { return send(res, 400, { error:'Solicitud inválida.' }); }
  }

  if (url.pathname === '/api/admin/logout' && req.method === 'POST') {
    const token = parseCookies(req.headers.cookie || '').admin_session; if (token) adminSessions.delete(token);
    return send(res, 200, { ok:true }, { 'Set-Cookie':'admin_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (url.pathname === '/api/admin/patients' && req.method === 'GET') {
    if (!isAdmin(req)) return send(res, 401, { error:'Acceso de administrador requerido.' });
    const records = Object.values(readDb()).map((item) => ({ rut:item.record?.document || '', name:item.record?.fullName || '', date:item.record?.date || '', updatedAt:item.updatedAt || '' })).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return send(res, 200, { records });
  }

  if (url.pathname.startsWith('/api/admin/patients/') && req.method === 'GET') {
    if (!isAdmin(req)) return send(res, 401, { error:'Acceso de administrador requerido.' });
    const rut = normalizeRut(decodeURIComponent(url.pathname.slice('/api/admin/patients/'.length))); const item = readDb()[rutKey(rut)];
    if (!item) return send(res, 404, { error:'Ficha no encontrada.' });
    return send(res, 200, { record:item.record, attachment:item.attachment ? { name:item.attachment.name, type:item.attachment.type, size:item.attachment.size } : null });
  }

  if (url.pathname.startsWith('/api/patients/')) {
    const rut = normalizeRut(decodeURIComponent(url.pathname.slice('/api/patients/'.length))); const key = rutKey(rut);
    if (!key || key.length < 8) return send(res, 400, { error:'RUT inválido.' });
    const db = readDb();
    if (req.method === 'GET') {
      if (!db[key]) return send(res, 404, { error:'Ficha no encontrada.' });
      const { record, attachment } = db[key];
      return send(res, 200, { record, attachment:attachment ? { name:attachment.name, type:attachment.type, size:attachment.size } : null });
    }
    if (req.method === 'PUT') {
      try {
        const payload = await readJson(req);
        if (!payload.record || typeof payload.record !== 'object') return send(res, 400, { error:'Datos de ficha incompletos.' });
        if (payload.attachment && !validAttachment(payload.attachment)) return send(res, 400, { error:'Documento inválido o supera 5 MB.' });
        const record = sanitizeRecord(payload.record); record.document = rut;
        const weight = Number.parseFloat(record.weight); const heightCm = Number.parseFloat(record.height);
        record.bmi = Number.isFinite(weight) && Number.isFinite(heightCm) && weight > 0 && heightCm > 0 ? (weight / Math.pow(heightCm / 100, 2)).toFixed(1) : '';
        db[key] = { record, attachment:payload.attachment ? { name:String(payload.attachment.name || 'documento').slice(0,180), type:payload.attachment.type, size:Number(payload.attachment.size), data:payload.attachment.data } : db[key]?.attachment || null, updatedAt:new Date().toISOString() };
        writeDb(db); return send(res, 200, { ok:true, message:'Ficha guardada.' });
      } catch (error) { return send(res, 400, { error:error.message === 'PAYLOAD_TOO_LARGE' ? 'La solicitud es demasiado grande.' : 'No se pudo guardar la ficha.' }); }
    }
    return send(res, 405, { error:'Método no permitido.' }, { Allow:'GET, PUT' });
  }

  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(ROOT, `.${requestedPath}`); const relativePath = path.relative(ROOT, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return send(res, 403, { error:'Forbidden' });
  fs.readFile(filePath, (error, data) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type':'text/plain; charset=utf-8' }); return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error'); }
    let output = data;
    if (requestedPath === '/index.html') {
      output = Buffer.from(data.toString('utf8').replace('</form>', '</form><a class="admin-access" href="/admin.html">Acceso de administrador</a>'), 'utf8');
    }
    const ext = path.extname(filePath).toLowerCase(); res.writeHead(200, { 'Content-Type':MIME[ext] || 'application/octet-stream', 'Cache-Control':ext === '.html' ? 'no-cache' : 'public, max-age=3600' }); res.end(output);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`FichaSalabrio listening on port ${PORT}`));

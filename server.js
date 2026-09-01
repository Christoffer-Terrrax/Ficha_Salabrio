const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'patients.json');
const MAX_BODY = 8 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon'
};

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '{}', 'utf8');

const readDb = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
};

const writeDb = (db) => {
  const temp = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temp, DB_FILE);
};

const normalizeRut = (value) => {
  const clean = String(value || '').toUpperCase().replace(/[^0-9K]/g, '');
  return clean.length >= 2 ? `${clean.slice(0, -1)}-${clean.slice(-1)}` : '';
};

const rutKey = (rut) => normalizeRut(rut).replace('-', '');

const send = (res, status, payload, headers = {}) => {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(body);
};

const readJson = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY) {
      reject(new Error('PAYLOAD_TOO_LARGE'));
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      resolve(JSON.parse(raw || '{}'));
    } catch {
      reject(new Error('INVALID_JSON'));
    }
  });
  req.on('error', reject);
});

const sanitizeRecord = (record = {}) => {
  const fields = [
    'fullName', 'birthDate', 'age', 'document', 'gender', 'phone', 'address',
    'emergencyName', 'emergencyRelation', 'emergencyPhone', 'insurance',
    'bloodType', 'allergies', 'medicalHistory', 'medications', 'date',
    'professional', 'reason', 'symptoms', 'diagnosis', 'treatment', 'notes'
  ];
  return fields.reduce((out, key) => {
    const value = record[key];
    out[key] = typeof value === 'string' ? value.trim().slice(0, 5000) : String(value ?? '').slice(0, 200);
    return out;
  }, {});
};

const validAttachment = (attachment) => {
  if (!attachment) return true;
  const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
  return allowed.has(attachment.type) && Number(attachment.size) <= 5 * 1024 * 1024 && typeof attachment.data === 'string';
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    return send(res, 200, { status: 'ok', service: 'FichaSalibrio' });
  }

  if (url.pathname.startsWith('/api/patients/')) {
    const rut = normalizeRut(decodeURIComponent(url.pathname.slice('/api/patients/'.length)));
    const key = rutKey(rut);
    if (!key || key.length < 8) return send(res, 400, { error: 'RUT inválido.' });

    const db = readDb();

    if (req.method === 'GET') {
      if (!db[key]) return send(res, 404, { error: 'Ficha no encontrada.' });
      const { record, attachment } = db[key];
      return send(res, 200, { record, attachment: attachment ? { name: attachment.name, type: attachment.type, size: attachment.size } : null });
    }

    if (req.method === 'PUT') {
      try {
        const payload = await readJson(req);
        if (!payload.record || typeof payload.record !== 'object') return send(res, 400, { error: 'Datos de ficha incompletos.' });
        if (payload.attachment && !validAttachment(payload.attachment)) return send(res, 400, { error: 'Documento inválido o supera 5 MB.' });

        const record = sanitizeRecord(payload.record);
        record.document = rut;
        db[key] = {
          record,
          attachment: payload.attachment ? {
            name: String(payload.attachment.name || 'documento').slice(0, 180),
            type: payload.attachment.type,
            size: Number(payload.attachment.size),
            data: payload.attachment.data
          } : db[key]?.attachment || null,
          updatedAt: new Date().toISOString()
        };
        writeDb(db);
        return send(res, 200, { ok: true, message: 'Ficha guardada.' });
      } catch (error) {
        const message = error.message === 'PAYLOAD_TOO_LARGE' ? 'La solicitud es demasiado grande.' : 'No se pudo guardar la ficha.';
        return send(res, 400, { error: message });
      }
    }

    return send(res, 405, { error: 'Método no permitido.' }, { Allow: 'GET, PUT' });
  }

  // Servir únicamente archivos que estén dentro del proyecto.
  const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.resolve(ROOT, `.${requestedPath}`);
  const relativePath = path.relative(ROOT, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) return send(res, 403, { error: 'Forbidden' });

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FichaSalibrio listening on port ${PORT}`);
});

import mongoose from 'mongoose';
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export function id(value) { if (typeof value !== 'string' || !mongoose.isObjectIdOrHexString(value)) fail(400, 'Invalid ID'); return value; }
export function body(req, fields) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) fail(400, 'A JSON object is required');
  if (Object.keys(req.body).some(k => !fields.includes(k))) fail(400, 'Unexpected request field');
  return req.body;
}
export function text(value, name, max = 1000) { if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, `${name} is required and must be a string of at most ${max} characters`); return value.trim(); }
export function page(req) {
  const p = Number(req.query.page ?? 1), limit = Number(req.query.limit ?? 20);
  if (!Number.isSafeInteger(p) || p < 1 || p > 100000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) fail(400, 'Invalid pagination (limit 1-100)');
  return { page: p, limit, skip: (p - 1) * limit };
}
export async function listing(res, model, filter, req, populate = '') {
  const { page: current, limit, skip } = page(req);
  const [items, total] = await Promise.all([model.find(filter).populate(populate).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), model.countDocuments(filter)]);
  return ok(res, { items, pagination: { page: current, limit, total, pages: Math.ceil(total / limit) } });
}
export function ok(res, data, message = 'Operation successful', status = 200) { return res.status(status).json({ success: true, message, data }); }

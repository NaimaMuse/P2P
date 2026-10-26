export function notFound(_req, res) { res.status(404).json({ success: false, message: 'Endpoint not found' }); }
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500, message = err.message;
  if (err.name === 'CastError') { status = 400; message = 'Invalid ID or field value'; }
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map(e => e.message).join('; '); }
  if (err.code === 11000) { status = 409; message = err.keyPattern?.email ? 'Email already registered' : 'A record with this unique value already exists'; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON'; }
  if (err.type === 'entity.too.large') { status = 413; message = 'Image is too large. Maximum size is 5 MB'; }
  if (status >= 500) { console.error(err); message = 'Server or database error'; }
  res.status(status).json({ success: false, message });
}

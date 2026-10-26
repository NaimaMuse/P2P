import { fail } from '../utils/helpers.js';
export const roles = (...allowed) => (req, _res, next) => { if (!allowed.includes(req.user.role)) fail(403, 'Access denied'); next(); };

import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import { fail } from '../utils/helpers.js';
export async function protect(req, _res, next) {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) fail(401, 'Authentication required');
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); } catch { fail(401, 'Invalid or expired token'); }
  req.user = await User.findById(payload.sub);
  if (!req.user) fail(401, 'Invalid token user');
  if (req.user.accountStatus !== 'active') fail(403, 'Account suspended');
  next();
}
export async function approvedSupplier(req, _res, next) {
  req.supplier = await Supplier.findOne({ user: req.user._id });
  if (!req.supplier || req.supplier.verificationStatus !== 'approved') fail(403, 'Approved supplier profile required');
  next();
}

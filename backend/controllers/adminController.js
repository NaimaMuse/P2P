import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { body, id, fail, ok, listing, page } from '../utils/helpers.js';
export const users = (req, res) => listing(res, User, {}, req);
export async function suppliers(req, res) {
  const { page: current, limit, skip } = page(req);
  const filter = { role: 'supplier' };
  const [accounts, total] = await Promise.all([User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), User.countDocuments(filter)]);
  const profiles = await Supplier.find({ user: { $in: accounts.map(account => account._id) } }).populate('category');
  const byUser = new Map(profiles.map(profile => [String(profile.user), profile]));
  const items = accounts.map(account => {
    const profile = byUser.get(String(account._id));
    return profile ? { ...profile.toObject(), user: account } : { _id: account._id, user: account, companyName: account.name, verificationStatus: account.supplierVerificationStatus || 'pending', profileRequired: true, createdAt: account.createdAt };
  });
  ok(res, { items, pagination: { page: current, limit, total, pages: Math.ceil(total / limit) } });
}
export const products = (req, res) => listing(res, Product, {}, req, 'supplier category');
export const orders = (req, res) => listing(res, Order, {}, req);
export async function userStatus(req, res) {
  const b = body(req, ['accountStatus']);
  if (!['active', 'suspended'].includes(b.accountStatus)) fail(400, 'Invalid account status');
  if (id(req.params.id) === String(req.user._id)) fail(400, 'Cannot change your own account status');
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { accountStatus: b.accountStatus } }, { returnDocument: 'after', runValidators: true });
  if (!user) fail(404, 'User not found'); ok(res, user);
}
export async function verification(req, res) {
  const b = body(req, ['verificationStatus']);
  if (!['pending', 'approved', 'rejected'].includes(b.verificationStatus)) fail(400, 'Invalid verification status');
  const supplier = await Supplier.findById(id(req.params.id));
  if (!supplier) {
    const account = await User.findOne({ _id: req.params.id, role: 'supplier' });
    if (!account) fail(404, 'Supplier not found');
    account.supplierVerificationStatus = b.verificationStatus;
    account.supplierVerificationNotification = { status: b.verificationStatus, createdAt: new Date(), message: b.verificationStatus === 'approved' ? 'Your supplier account is approved. Add your shop details to start listing products.' : b.verificationStatus === 'rejected' ? 'Your supplier account verification was rejected by an admin.' : 'Your supplier account is awaiting admin review.' };
    await account.save();
    return ok(res, { verificationStatus: account.supplierVerificationStatus, verificationNotification: account.supplierVerificationNotification });
  }
  if (supplier.verificationStatus !== b.verificationStatus) {
    supplier.verificationStatus = b.verificationStatus;
    supplier.verificationNotification = { status: b.verificationStatus, createdAt: new Date(), message: b.verificationStatus === 'approved' ? 'Your shop has been approved by an admin. You can now add products and sell.' : b.verificationStatus === 'rejected' ? 'Your shop verification was rejected. Review your shop details and submit them again for review.' : 'Your shop is awaiting admin review.' };
    await supplier.save();
  }
  ok(res, supplier);
}
export async function deactivate(req, res) {
  const product = await Product.findByIdAndUpdate(id(req.params.id), { $set: { isActive: false } }, { returnDocument: 'after' });
  if (!product) fail(404, 'Product not found'); ok(res, product, 'Product deactivated');
}


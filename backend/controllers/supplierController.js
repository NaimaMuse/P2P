import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Order, { supplierAmounts } from '../models/Order.js';
import Category from '../models/Category.js';
import { publicSuppliers } from './productController.js';
import { body, text, id, fail, ok, listing, page } from '../utils/helpers.js';
export async function ownSupplier(req) { const supplier = await Supplier.findOne({ user: req.user._id }); if (!supplier) fail(404, 'Supplier profile not found'); return supplier; }
export async function getSupplier(req, res) {
  const supplier = await Supplier.findOne({ verificationStatus: 'approved', _id: { $eq: id(req.params.id), $in: await publicSuppliers() } }).select('companyName category description image address phone verificationStatus createdAt').populate('category');
  if (!supplier) fail(404, 'Supplier not found'); ok(res, supplier);
}
export const getMe = async (req, res) => ok(res, await (await ownSupplier(req)).populate('category'));
export const getSuppliers = async (req, res) => listing(res, Supplier, { _id: { $in: await publicSuppliers() } }, req, 'category');
export async function updateMe(req, res) {
  const b = body(req, ['companyName', 'address', 'phone', 'category', 'description', 'image']);
  let supplier = await Supplier.findOne({ user: req.user._id });
  const values = {};
  if (b.category !== undefined) {
    if (!await Category.exists({ _id: id(b.category) })) fail(400, 'Category not found');
    values.category = b.category;
  }
  for (const key of ['description', 'image']) if (b[key] !== undefined) {
    if (typeof b[key] !== 'string') fail(400, `${key} must be text`);
    values[key] = b[key];
  }
  for (const key of ['companyName', 'address', 'phone']) if (b[key] !== undefined) values[key] = text(b[key], key, key === 'phone' ? 40 : key === 'companyName' ? 200 : 1000);
  if (!supplier) supplier = new Supplier({ user: req.user._id, ...values, verificationStatus: req.user.supplierVerificationStatus || 'pending', verificationNotification: req.user.supplierVerificationNotification });
  else { Object.assign(supplier, values); if (['companyName', 'address', 'phone', 'category', 'description', 'image'].some(key => supplier.isModified(key))) supplier.verificationStatus = 'pending'; }
  if (supplier.verificationStatus === 'pending') supplier.verificationNotification = { status: 'pending', message: 'Your shop details have been submitted. Please wait for admin approval before selling.', createdAt: new Date() };
  await supplier.save(); ok(res, supplier);
}
export async function myProducts(req, res) { const supplier = await ownSupplier(req); return listing(res, Product, { supplier: supplier._id }, req, 'category'); }
export function supplierView(order, supplierId) {
  const result = order.toObject(); result.items = result.items.filter(i => String(i.supplier) === String(supplierId));
  result.totalAmount = Math.round(result.items.reduce((sum, i) => sum + i.subtotal, 0) * 100) / 100;
  result.supplierAmounts = supplierAmounts(result.items);
  // Supplier subtotals are a partial view, not the full buyer agreement record.
  delete result.buyer; delete result.paymentStatus; delete result.agreement; return result;
}
export async function myOrders(req, res) {
  const supplier = await ownSupplier(req), { page: current, limit, skip } = page(req), filter = { 'items.supplier': supplier._id };
  const orders = await Order.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit);
  ok(res, { items: orders.map(o => supplierView(o, supplier._id)), pagination: { page: current, limit, total: await Order.countDocuments(filter) } });
}



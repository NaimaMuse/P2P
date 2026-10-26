import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import { body, id, fail, ok, listing } from '../utils/helpers.js';
export async function publicSuppliers() {
  const users = await User.find({ role: 'supplier', accountStatus: 'active' }).distinct('_id');
  return Supplier.find({ verificationStatus: 'approved', user: { $in: users } }).distinct('_id');
}
export async function getProducts(req, res) {
  const filter = { isActive: true, supplier: { $in: await publicSuppliers() } };
  if (req.query.search !== undefined) {
    if (typeof req.query.search !== 'string' || req.query.search.length > 200) fail(400, 'Invalid search');
    filter.name = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  if (req.query.category) filter.category = id(req.query.category);
  return listing(res, Product, filter, req, 'category supplier');
}
export async function getProduct(req, res) {
  const product = await Product.findOne({ _id: id(req.params.id), isActive: true, supplier: { $in: await publicSuppliers() } }).populate('category supplier');
  if (!product) fail(404, 'Product not found'); ok(res, product);
}
const fields = ['category', 'name', 'description', 'price', 'stockQuantity', 'minimumOrderQuantity', 'sellingType', 'unit', 'images', 'isActive'];
async function validateFields(b) {
  if (b.sellingType !== undefined && !['wholesale', 'single'].includes(b.sellingType)) fail(400, 'Selling type must be wholesale or single');
  if (b.category !== undefined && !await Category.exists({ _id: id(b.category) })) fail(400, 'Category not found');
  for (const key of ['price', 'stockQuantity', 'minimumOrderQuantity']) if (b[key] !== undefined && typeof b[key] !== 'number') fail(400, `${key} must be a number`);
  if (b.isActive !== undefined && typeof b.isActive !== 'boolean') fail(400, 'isActive must be boolean');
  for (const key of ['name', 'description', 'unit']) if (b[key] !== undefined && typeof b[key] !== 'string') fail(400, `${key} must be a string`);
  if (b.images !== undefined && (!Array.isArray(b.images) || b.images.some(i => typeof i !== 'string'))) fail(400, 'images must be an array of URLs');
}
export async function createProduct(req, res) {
  const b = body(req, fields); await validateFields(b);
  ok(res, await Product.create({ ...b, supplier: req.supplier._id }), 'Product created', 201);
}
export async function updateProduct(req, res) {
  const b = body(req, fields); await validateFields(b);
  const product = await Product.findOne({ _id: id(req.params.id), supplier: req.supplier._id });
  if (!product) fail(404, 'Owned product not found');
  Object.assign(product, b); await product.save(); ok(res, product);
}
export async function deleteProduct(req, res) {
  const product = await Product.findOneAndUpdate({ _id: id(req.params.id), supplier: req.supplier._id }, { $set: { isActive: false } }, { returnDocument: 'after' });
  if (!product) fail(404, 'Owned product not found'); ok(res, product, 'Product deactivated');
}


import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import { body, id, fail, ok } from '../utils/helpers.js';
export const getCategories = async (_req, res) => ok(res, await Category.find().sort({ name: 1 }));
export async function createCategory(req, res) { const b = body(req, ['name', 'description']); ok(res, await Category.create(b), 'Category created', 201); }
export async function updateCategory(req, res) {
  const b = body(req, ['name', 'description']);
  const category = await Category.findById(id(req.params.id));
  if (!category) fail(404, 'Category not found');
  Object.assign(category, b); await category.save(); ok(res, category);
}
export async function deleteCategory(req, res) {
  const category = await Category.findById(id(req.params.id));
  if (!category) fail(404, 'Category not found');
  if (await Product.exists({ category: category._id })) fail(409, 'Category is referenced by products');
  if (await Supplier.exists({ category: category._id })) fail(409, 'Category is referenced by shops');
  await category.deleteOne(); ok(res, null, 'Category deleted');
}


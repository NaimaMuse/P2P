import mongoose from 'mongoose';
const integer = { validator: Number.isSafeInteger, message: 'Quantity must be a safe integer' };
export function sellingTypeFor(product) {
  return product.sellingType || (product.minimumOrderQuantity > 1 ? 'wholesale' : 'single');
}
export function minimumOrderFor(product) {
  return sellingTypeFor(product) === 'single' ? 1 : Math.max(2, product.minimumOrderQuantity || 2);
}
const schema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 5000 },
  price: { type: Number, required: true, min: 0.01, max: 100000000, validate: { validator: v => Number.isFinite(v) && Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, message: 'Price must have at most two decimal places' } },
  stockQuantity: { type: Number, required: true, min: 0, validate: integer },
  sellingType: { type: String, enum: ['wholesale', 'single'], required: true },
  minimumOrderQuantity: { type: Number, required: true, default: 1, min: 1, validate: integer },
  // Kept for historical records and price measurement; no longer a visible form field.
  unit: { type: String, required: true, default: 'piece', trim: true, maxlength: 40 },
  images: { type: [String], default: [], validate: { validator: v => v.length <= 10 && v.every(s => (/^https?:\/\//.test(s) || /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(s)) && s.length <= 2048), message: 'Use up to 10 uploaded images or HTTP(S) image URLs' } },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: {
  transform(_doc, result) {
    // Legacy records remain readable without a destructive data migration.
    if (result.sellingType === undefined) result.sellingType = result.minimumOrderQuantity > 1 ? 'wholesale' : 'single';
    if (result.sellingType === 'single') result.minimumOrderQuantity = 1;
    return result;
  }
} });
schema.pre('validate', function () {
  if (this.sellingType === undefined) this.sellingType = this.minimumOrderQuantity > 1 ? 'wholesale' : 'single';
  if (this.sellingType === 'single') this.minimumOrderQuantity = 1;
  if (this.sellingType === 'wholesale' && (!Number.isSafeInteger(this.minimumOrderQuantity) || this.minimumOrderQuantity < 2)) {
    this.invalidate('minimumOrderQuantity', 'Wholesale products require a minimum order quantity of at least 2');
  }
});
export default mongoose.model('Product', schema);

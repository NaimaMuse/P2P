import mongoose from 'mongoose';
export const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
export const commissionPerItemCents = 20;
export function supplierAmounts(items) {
  const active = items.filter(item => item.fulfillmentStatus !== 'cancelled');
  const grossCents = active.reduce((sum, item) => sum + Math.round(item.subtotal * 100), 0);
  const commissionCents = active.reduce((sum, item) => sum + Math.round((item.commissionAmount || 0) * 100), 0);
  return { grossAmount: grossCents / 100, commissionAmount: commissionCents / 100, supplierNetAmount: (grossCents - commissionCents) / 100 };
}
export function deriveStatus(items) {
  if (items.every(i => i.fulfillmentStatus === 'cancelled')) return 'cancelled';
  const active = items.filter(i => i.fulfillmentStatus !== 'cancelled');
  if (active.every(i => i.fulfillmentStatus === 'delivered')) return 'delivered';
  if (active.every(i => ['shipped', 'delivered'].includes(i.fulfillmentStatus))) return 'shipped';
  if (items.every(i => i.fulfillmentStatus === 'pending')) return 'pending';
  return 'processing';
}
const item = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  productName: { type: String, required: true },
  supplierName: { type: String },
  quantity: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  unitPrice: { type: Number, required: true, min: 0 },
  subtotal: { type: Number, required: true, min: 0 },
  // No defaults: historical orders are not charged retroactively.
  commissionPerItem: { type: Number, min: 0 },
  commissionAmount: { type: Number, min: 0 },
  supplierNetAmount: { type: Number },
  fulfillmentStatus: { type: String, enum: statuses, default: 'pending' }
});
export default mongoose.model('Order', new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Optional for historical orders; required by the new checkout controller.
  agreement: { type: new mongoose.Schema({
    version: { type: String, required: true },
    accepted: { type: Boolean, required: true },
    text: { type: String, required: true },
    hash: { type: String, required: true },
    acceptedAt: { type: Date, required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true },
    buyerEmail: { type: String, required: true },
  }, { _id: false }), immutable: true, default: undefined },
  items: { type: [item], required: true, validate: v => v.length > 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  deliveryAddress: { type: String, required: true, trim: true, maxlength: 1000 },
  paymentMethod: { type: String, enum: ['cash_on_delivery', 'zaad_demo', 'edahab_demo'], default: 'cash_on_delivery' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  orderStatus: { type: String, enum: statuses, default: 'pending' }
}, { timestamps: true }));

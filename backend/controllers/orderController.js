import mongoose from 'mongoose';
import Product, { minimumOrderFor } from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Order, { deriveStatus, commissionPerItemCents } from '../models/Order.js';
import { ownSupplier, supplierView } from './supplierController.js';
import { body, text, id, fail, ok, listing } from '../utils/helpers.js';
import { purchaseAgreement } from '../utils/purchaseAgreement.js';
export const getAgreement = (_req, res) => ok(res, purchaseAgreement);
export async function createOrder(req, res) {
  const b = body(req, ['items', 'deliveryAddress', 'paymentMethod', 'agreement', 'expectedTotal']);
  if (!b.agreement || b.agreement.accepted !== true || b.agreement.version !== purchaseAgreement.version) fail(400, 'Review and accept the current purchase agreement before ordering');
  if (!Number.isFinite(b.expectedTotal) || b.expectedTotal < 0) fail(400, 'Provide the total amount reviewed in the purchase agreement');
  const deliveryAddress = text(b.deliveryAddress, 'Delivery address');
  if (b.paymentMethod !== undefined && !['cash_on_delivery', 'zaad_demo', 'edahab_demo'].includes(b.paymentMethod)) fail(400, 'Choose Cash on Delivery or a simulated Zaad/eDahab payment');
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 100) fail(400, 'Provide 1-100 order items');
  const seen = new Set();
  for (const item of b.items) {
    if (!item || typeof item !== 'object' || Object.keys(item).some(k => !['product', 'quantity'].includes(k))) fail(400, 'Invalid order item');
    id(item.product);
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) fail(400, 'Quantity must be a positive safe integer');
    const key = item.product.toLowerCase(); if (seen.has(key)) fail(400, 'Duplicate product IDs'); seen.add(key);
  }
  let order;
  await mongoose.connection.transaction(async session => {
    const items = []; const recipients = new Set(); let totalCents = 0, totalCommissionCents = 0;
    for (const requested of b.items) {
      const product = await Product.findOne({ _id: requested.product, isActive: true }).session(session);
      if (!product) fail(400, 'Product unavailable');
      const supplier = await Supplier.findOne({ _id: product.supplier, verificationStatus: 'approved' }).session(session);
      if (!supplier || !await User.exists({ _id: supplier.user, accountStatus: 'active', role: 'supplier' }).session(session)) fail(400, 'Supplier unavailable');
      const minimum = minimumOrderFor(product);
      recipients.add(String(supplier.user));
      if (requested.quantity < minimum) fail(400, `Minimum quantity for ${product.name} is ${minimum}`);
      const updated = await Product.updateOne({ _id: product._id, isActive: true, stockQuantity: { $gte: requested.quantity } }, { $inc: { stockQuantity: -requested.quantity } }, { session });
      if (!updated.modifiedCount) fail(409, `Insufficient stock for ${product.name}`);
      const cents = Math.round(product.price * 100) * requested.quantity;
      if (!Number.isSafeInteger(cents) || !Number.isSafeInteger(totalCents + cents)) fail(400, 'Order amount exceeds supported maximum');
      totalCents += cents;
      const commissionCents = commissionPerItemCents * requested.quantity;
      if (!Number.isSafeInteger(commissionCents) || !Number.isSafeInteger(totalCommissionCents + commissionCents)) fail(400, 'Commission exceeds supported maximum');
      totalCommissionCents += commissionCents;
      items.push({ product: product._id, supplier: supplier._id, supplierName: supplier.companyName, productName: product.name, quantity: requested.quantity, unitPrice: product.price, subtotal: cents / 100,
        commissionPerItem: commissionPerItemCents / 100, commissionAmount: commissionCents / 100, supplierNetAmount: (cents - commissionCents) / 100 });
    }
    if (Math.round(b.expectedTotal * 100) !== totalCents) fail(409, 'Prices have changed. Refresh your cart and review the order again before confirming');
    [order] = await Order.create([{ buyer: req.user._id, items, totalAmount: totalCents / 100, deliveryAddress, paymentMethod: b.paymentMethod || 'cash_on_delivery',
      agreement: { ...purchaseAgreement, accepted: true, acceptedAt: new Date(), acceptedBy: req.user._id, buyerName: req.user.name, buyerEmail: req.user.email }
    }], { session });
    await Notification.create([
      { user: req.user._id, order: order._id, message: `Order #${String(order._id).slice(-8).toUpperCase()} placed. Status: pending.` },
      ...[...recipients].map(user => ({ user, order: order._id, message: `New order #${String(order._id).slice(-8).toUpperCase()} received. Open Incoming orders to process your items.` }))
    ], { session, ordered: true });
  });
  ok(res, order, 'Order placed', 201);
}
export const myOrders = (req, res) => listing(res, Order, { buyer: req.user._id }, req);
export async function getOrder(req, res) {
  const order = await Order.findById(id(req.params.id)); if (!order) fail(404, 'Order not found');
  if (req.user.role === 'admin') return ok(res, order);
  if (req.user.role === 'buyer' && String(order.buyer) === String(req.user._id)) return ok(res, order);
  if (req.user.role === 'supplier') { const supplier = await ownSupplier(req); if (order.items.some(i => String(i.supplier) === String(supplier._id))) return ok(res, supplierView(order, supplier._id)); }
  fail(403, 'Access denied');
}
const transitions = { pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: [], cancelled: [] };
export async function fulfillment(req, res) {
  const b = body(req, ['itemId', 'fulfillmentStatus']); id(b.itemId); id(req.params.id);
  if (typeof b.fulfillmentStatus !== 'string' || !Object.hasOwn(transitions, b.fulfillmentStatus)) fail(400, 'Invalid fulfillment status');
  const supplier = await ownSupplier(req); let result;
  await mongoose.connection.transaction(async session => {
    const order = await Order.findById(req.params.id).session(session); if (!order) fail(404, 'Order not found');
    const item = order.items.id(b.itemId);
    if (!item || String(item.supplier) !== String(supplier._id)) fail(403, 'Cannot update another supplier item');
    if (item.fulfillmentStatus !== b.fulfillmentStatus) {
      if (!transitions[item.fulfillmentStatus].includes(b.fulfillmentStatus)) fail(409, 'Invalid fulfillment transition');
      if (b.fulfillmentStatus === 'cancelled') {
        await Product.updateOne({ _id: item.product }, { $inc: { stockQuantity: item.quantity } }, { session });
        if (item.commissionAmount !== undefined) { item.commissionAmount = 0; item.supplierNetAmount = 0; }
      }
      item.fulfillmentStatus = b.fulfillmentStatus;
      order.orderStatus = deriveStatus(order.items); await order.save({ session });
      await Notification.create([{ user: order.buyer, order: order._id, message: `${item.productName} in order #${String(order._id).slice(-8).toUpperCase()} ${b.fulfillmentStatus === 'cancelled' ? 'was cancelled' : `is now ${b.fulfillmentStatus}`} by ${supplier.companyName}. Overall order status: ${order.orderStatus}.` }], { session });
    }
    result = supplierView(order, supplier._id);
  });
  ok(res, result);
}


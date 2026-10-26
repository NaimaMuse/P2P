import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { uploadDirectory } from '../middleware/productImages.js';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { app } from '../server.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order, { deriveStatus, supplierAmounts } from '../models/Order.js';
import { purchaseAgreement } from '../utils/purchaseAgreement.js';
import Notification from '../models/Notification.js';
let replica, server, base;
process.env.JWT_SECRET = 'test-only-secret-at-least-32-characters-long';
before(async () => {
  // Isolated, disposable replica set: never connects to or clears an application database.
  const localBinary = 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: existsSync(localBinary) ? { systemBinary: localBinary, version: '8.3.4' } : undefined });
  await connectDB(replica.getUri('p2p_test'));
  await Promise.all([User.init(), Supplier.init(), Product.init(), Category.init(), Order.init()]);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
}, { timeout: 180000 });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (replica) await replica.stop(); });
async function request(method, path, data, token) {
  // Existing checkout scenarios model a buyer who has reviewed the current terms/prices.
  if (method === 'POST' && path === '/orders' && data && data.agreement === undefined) {
    let total = 0;
    for (const item of data.items || []) {
      if (mongoose.isValidObjectId(item?.product)) {
        const product = await Product.findById(item.product);
        total += Math.round((product?.price || 0) * 100) * item.quantity;
      }
    }
    data = { ...data, agreement: { accepted: true, version: purchaseAgreement.version }, expectedTotal: total / 100 };
  }
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data !== undefined ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, ...(await response.json()) };
}
async function register(email, role = 'buyer') {
  const response = await request('POST', '/auth/register', { name: email, email: `${email}@example.com`, password: 'StrongPass123!', role });
  assert.equal(response.status, 201); assert.equal(response.data.user.password, undefined); return response.data;
}
test('uploaded supplier photos appear in public categories and support real checkout', async () => {
  const seller = await register('image-seller', 'supplier');
  const buyer = await register('image-buyer');
  const profile = await Supplier.create({ user: seller.user._id, companyName: 'Beauty Supply', address: 'Nairobi', phone: '12345678', verificationStatus: 'approved' });
  const category = await Category.create({ name: 'Beauty upload test' });
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const upload = (token, data = bytes, type = 'image/png') => fetch(base + '/products/images', { method: 'POST', headers: { 'Content-Type': type, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data });
  assert.equal((await upload()).status, 401);
  assert.equal((await upload(buyer.token)).status, 403);
  assert.equal((await upload(seller.token, Buffer.from('not a photo'))).status, 400);
  assert.equal((await upload(seller.token, Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const response = await upload(seller.token); assert.equal(response.status, 201);
  const { data: { url } } = await response.json();
  try {
    const image = await fetch(new URL(url, base)); assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), bytes);
    const created = await request('POST', '/products', { name: 'Sun cream', category: category._id.toString(), price: 10, stockQuantity: 100, sellingType: 'single', images: [url] }, seller.token);
    assert.equal(created.status, 201); assert.equal(created.data.supplier, profile._id.toString());
    const listed = await request('GET', `/products?category=${category._id}`);
    assert.equal(listed.data.items[0]._id, created.data._id); assert.equal(listed.data.items[0].images[0], url);
    const ordered = await request('POST', '/orders', { items: [{ product: created.data._id, quantity: 1 }], deliveryAddress: 'Buyer shop, Nairobi', paymentMethod: 'cash_on_delivery' }, buyer.token);
    assert.equal(ordered.status, 201); assert.equal(ordered.data.totalAmount, 10); assert.equal(ordered.data.paymentStatus, 'pending');
    assert.equal(ordered.data.agreement.text, purchaseAgreement.text);
    assert.equal(ordered.data.agreement.accepted, true);
    assert.equal(ordered.data.items[0].supplierName, 'Beauty Supply');
    assert.equal(ordered.data.agreement.acceptedBy, buyer.user._id);
    assert.equal(ordered.data.agreement.buyerEmail, 'image-buyer@example.com');
    assert.ok(ordered.data.agreement.acceptedAt);
    const payload = { items: [{ product: created.data._id, quantity: 1 }], deliveryAddress: 'Nairobi', expectedTotal: 10 };
    const noAcceptance = await fetch(base + '/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${buyer.token}` }, body: JSON.stringify(payload) });
    assert.equal(noAcceptance.status, 400);
    for (const agreement of [null, { accepted: false, version: purchaseAgreement.version }, { accepted: true, version: 'old' }]) {
      assert.equal((await request('POST', '/orders', { ...payload, agreement }, buyer.token)).status, 400);
    }
    assert.equal((await request('POST', '/orders', { ...payload, expectedTotal: 1, agreement: { accepted: true, version: purchaseAgreement.version } }, buyer.token)).status, 409);
    const saved = await request('GET', `/orders/${ordered.data._id}`, undefined, buyer.token);
    assert.equal(saved.data.agreement.hash, purchaseAgreement.hash);
    assert.equal((await Product.findById(created.data._id)).stockQuantity, 99);
    for (const paymentMethod of ['zaad_demo', 'edahab_demo']) {
      const simulated = await request('POST', '/orders', { ...payload, paymentMethod }, buyer.token);
      assert.equal(simulated.status, 201);
      assert.equal(simulated.data.paymentMethod, paymentMethod);
      assert.equal(simulated.data.paymentStatus, 'pending');
    }
  } finally {
    await unlink(new URL(url.split('/').pop(), uploadDirectory));
    await Order.deleteMany({ buyer: buyer.user._id });
    await Product.deleteMany({ supplier: profile._id });
    await Supplier.deleteOne({ _id: profile._id });
    await Category.deleteOne({ _id: category._id });
    await User.deleteMany({ _id: { $in: [seller.user._id, buyer.user._id] } });
  }
});
test('legacy order earnings have no retroactive commission', () => {
  assert.deepEqual(supplierAmounts([{ subtotal: 10, fulfillmentStatus: 'pending' }]), { grossAmount: 10, commissionAmount: 0, supplierNetAmount: 10 });
});
test('shop registration requires admin approval and public directory includes approved empty shops', async () => {
  const owner = await register('shop-owner', 'supplier');
  const admin = await register('shop-reviewer');
  await User.updateOne({ _id: admin.user._id }, { role: 'admin' });
  const category = await Category.create({ name: 'Shop clothing test' });
  let shop;
  try {
    const beforeProfile = await request('GET', '/admin/suppliers', undefined, admin.token);
    const registered = beforeProfile.data.items.find(item => item.user._id === owner.user._id);
    assert.equal(registered.profileRequired, true);
    assert.equal(registered.verificationStatus, 'pending');
    assert.equal(registered.user.password, undefined);
    assert.equal((await request('PATCH', `/admin/suppliers/${owner.user._id}/verification`, { verificationStatus: 'approved' }, admin.token)).status, 200);
    assert.equal((await request('GET', '/auth/me', undefined, owner.token)).data.supplierVerificationNotification.status, 'approved');
    const created = await request('PUT', '/suppliers/me', { companyName: 'Local clothing shop', address: 'Hargeisa', phone: '12345678', category: String(category._id), description: 'Clothing and uniforms', image: '/uploads/1234-abcd.jpg' }, owner.token);
    assert.equal(created.status, 200); shop = created.data;
    assert.equal(shop.verificationStatus, 'approved');
    await request('PATCH', `/admin/suppliers/${shop._id}/verification`, { verificationStatus: 'pending' }, admin.token);
    assert.equal((await request('GET', `/suppliers/${shop._id}`)).status, 404);
    assert.equal((await request('GET', '/suppliers')).data.items.some(item => item._id === shop._id), false);
    assert.equal((await request('POST', '/products', {}, owner.token)).status, 403);
    assert.equal((await request('PATCH', `/admin/suppliers/${shop._id}/verification`, { verificationStatus: 'approved' }, owner.token)).status, 403);
    assert.equal((await request('PATCH', `/admin/suppliers/${shop._id}/verification`, { verificationStatus: 'approved' }, admin.token)).status, 200);
    const notification = (await request('GET', '/suppliers/me', undefined, owner.token)).data.verificationNotification;
    assert.equal(notification.status, 'approved'); assert.ok(notification.createdAt);
    assert.match(notification.message, /approved/);
    const shops = await request('GET', '/suppliers');
    const visible = shops.data.items.find(item => item._id === shop._id);
    assert.equal(visible.category.name, category.name); assert.equal(visible.image, '/uploads/1234-abcd.jpg');
    const review = await request('GET', '/admin/suppliers', undefined, admin.token);
    assert.equal(review.data.items.find(item => item._id === shop._id).category.name, category.name);
    const edited = await request('PUT', '/suppliers/me', { description: 'Updated shop description' }, owner.token);
    assert.equal(edited.data.verificationStatus, 'pending');
    assert.equal((await request('GET', `/suppliers/${shop._id}`)).status, 404);
    await request('PATCH', `/admin/suppliers/${shop._id}/verification`, { verificationStatus: 'rejected' }, admin.token);
    assert.equal((await request('GET', '/suppliers/me', undefined, owner.token)).data.verificationNotification.status, 'rejected');
  } finally {
    await Supplier.deleteMany({ user: owner.user._id });
    await Category.deleteOne({ _id: category._id });
    await User.deleteMany({ _id: { $in: [owner.user._id, admin.user._id] } });
  }
});
test('marketplace integration and concurrent checkout', async t => {
  let buyer, otherBuyer, seller1, seller2, admin, category, p1, p2, order;
  await t.test('health and invalid JSON/IDs', async () => {
    assert.equal((await request('GET', '/health')).success, true);
    assert.equal((await request('GET', '/products/bad')).status, 400);
    const r = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }); assert.equal(r.status, 400);
  });
  await t.test('registration validates roles, passwords and duplicate emails', async () => {
    buyer = await register('buyer'); otherBuyer = await register('other'); seller1 = await register('seller1', 'supplier'); seller2 = await register('seller2', 'supplier');
    assert.equal((await request('POST', '/auth/register', { name: 'x', email: 'x@example.com', password: 'StrongPass123!', role: 'admin' })).status, 400);
    assert.equal((await request('POST', '/auth/register', { name: 'x', email: 'weak@example.com', password: 'short' })).status, 400);
    assert.equal((await request('POST', '/auth/register', { name: 'x', email: 'buyer@example.com', password: 'StrongPass123!' })).status, 409);
  });
  await t.test('login, invalid credentials, protected endpoints and suspension', async () => {
    assert.equal((await request('POST', '/auth/login', { email: 'buyer@example.com', password: 'StrongPass123!' })).status, 200);
    assert.equal((await request('POST', '/auth/login', { email: 'buyer@example.com', password: 'wrongpass' })).status, 401);
    assert.equal((await request('GET', '/auth/me')).status, 401);
    assert.equal((await request('GET', '/auth/me', undefined, buyer.token)).data.password, undefined);
    assert.equal((await request('GET', '/admin/users', undefined, buyer.token)).status, 403);
    await User.updateOne({ _id: otherBuyer.user._id }, { accountStatus: 'suspended' });
    assert.equal((await request('GET', '/auth/me', undefined, otherBuyer.token)).status, 403);
    await User.updateOne({ _id: otherBuyer.user._id }, { accountStatus: 'active' });
    admin = await register('administrator'); await User.updateOne({ _id: admin.user._id }, { role: 'admin' });
  });
  await t.test('supplier profiles and approval rules', async () => {
    for (const s of [seller1, seller2]) {
      const r = await request('PUT', '/suppliers/me', { companyName: 'Wholesale', address: 'Nairobi', phone: '+254700000000' }, s.token); assert.equal(r.status, 200); s.profile = r.data;
      assert.equal((await request('POST', '/products', {}, s.token)).status, 403);
      assert.equal((await request('PATCH', `/admin/suppliers/${s.profile._id}/verification`, { verificationStatus: 'approved' }, admin.token)).status, 200);
    }
    assert.equal((await request('GET', `/suppliers/${seller1.profile._id}`)).status, 200);
  });
  await t.test('categories, product creation, ownership, filtering and deactivation', async () => {
    assert.equal((await request('POST', '/categories', { name: 'Food' }, buyer.token)).status, 403);
    category = (await request('POST', '/categories', { name: 'Food' }, admin.token)).data;
    const fields = { category: category._id, name: 'Bulk Rice', price: 12.35, stockQuantity: 20, minimumOrderQuantity: 2, unit: 'bag' };
    let r = await request('POST', '/products', fields, seller1.token); assert.equal(r.status, 201); p1 = r.data;
    r = await request('POST', '/products', { ...fields, name: 'Bulk Beans' }, seller2.token); assert.equal(r.status, 201); p2 = r.data;
    assert.equal((await request('PUT', `/products/${p1._id}`, { price: 1 }, seller2.token)).status, 404);
    assert.equal((await request('GET', '/products?search=rice')).data.items.length, 1);
    assert.equal((await request('GET', '/products?search=%5B')).status, 200);
    assert.equal((await request('GET', `/products?category=${category._id}`)).data.items.length, 2);
    assert.equal((await request('GET', '/products?page=0')).status, 400);
    assert.equal((await request('DELETE', `/categories/${category._id}`, undefined, admin.token)).status, 409);
    assert.equal((await request('POST', '/products', { ...fields, price: -1 }, seller1.token)).status, 400);
    assert.equal((await request('DELETE', `/admin/products/${p2._id}`, undefined, admin.token)).status, 200);
    assert.equal((await request('GET', `/products/${p2._id}`)).status, 404);
    await request('PUT', `/products/${p2._id}`, { isActive: true }, seller2.token);
  });
  const checkout = items => ({ items, deliveryAddress: 'Shop 10, Nairobi', paymentMethod: 'cash_on_delivery' });
  await t.test('checkout rejects MOQ, insufficient stock and invalid items; rollback', async () => {
    assert.equal((await request('POST', '/orders', checkout([{ product: p1._id, quantity: 1 }]), buyer.token)).status, 400);
    assert.equal((await request('POST', '/orders', checkout([{ product: p1._id, quantity: 21 }]), buyer.token)).status, 409);
    assert.equal((await request('POST', '/orders', checkout([{ product: p1._id, quantity: 2 }, { product: p2._id, quantity: 30 }]), buyer.token)).status, 409);
    assert.equal((await Product.findById(p1._id)).stockQuantity, 20);
    assert.equal(await Order.countDocuments(), 0);
    assert.equal((await request('POST', '/orders', checkout([{ product: p1._id, quantity: 2 }, { product: p1._id, quantity: 2 }]), buyer.token)).status, 400);
    assert.equal((await request('POST', '/orders', { ...checkout([{ product: p1._id, quantity: 2 }]), totalAmount: 1 }, buyer.token)).status, 400);
    assert.equal((await request('POST', '/orders', checkout([{ product: p1._id, quantity: 2 }]), seller1.token)).status, 403);
  });
  await t.test('multi-supplier order snapshots and unauthorized access', async () => {
    const r = await request('POST', '/orders', checkout([{ product: p1._id, quantity: 2 }, { product: p2._id, quantity: 3 }]), buyer.token);
    assert.equal(r.status, 201); order = r.data; assert.equal(order.totalAmount, 61.75); assert.equal(order.paymentStatus, 'pending');
    assert.equal(order.items[0].commissionPerItem, 0.2);
    assert.equal(order.items[0].commissionAmount, 0.4);
    assert.equal(order.items[0].supplierNetAmount, 24.3);
    assert.equal(order.items[1].commissionAmount, 0.6);
    assert.equal(order.items[1].supplierNetAmount, 36.45);
    assert.equal((await Product.findById(p1._id)).stockQuantity, 18);
    assert.equal((await request('GET', `/orders/${order._id}`, undefined, otherBuyer.token)).status, 403);
    const view = await request('GET', `/orders/${order._id}`, undefined, seller1.token); assert.equal(view.data.items.length, 1); assert.equal(view.data.totalAmount, 24.7);
    assert.deepEqual(view.data.supplierAmounts, { grossAmount: 24.7, commissionAmount: 0.4, supplierNetAmount: 24.3 });
    for (const seller of [seller1, seller2]) {
      const feed = await request('GET', '/auth/notifications', undefined, seller.token);
      assert.equal(feed.data.items.filter(item => item.order === order._id).length, 1);
      assert.match(feed.data.items[0].message, /New order/);
    }
    assert.match((await request('GET', '/auth/notifications', undefined, buyer.token)).data.items[0].message, /pending/);
    assert.equal((await request('GET', '/orders/my-orders', undefined, buyer.token)).data.items.length, 1);
    const supplierOrders = (await request('GET', '/suppliers/me/orders', undefined, seller1.token)).data.items;
    assert.equal(supplierOrders[0].items.length, 1);
    assert.equal(supplierOrders[0].items[0].fulfillmentStatus, 'pending');
    await request('PUT', `/products/${p1._id}`, { price: 99 }, seller1.token);
    assert.equal((await request('GET', `/orders/${order._id}`, undefined, buyer.token)).data.items[0].unitPrice, 12.35);
  });
  await t.test('supplier fulfillment isolation, transitions, cancellation and restocking', async () => {
    const update = (item, status, token) => request('PATCH', `/orders/${order._id}/fulfillment`, { itemId: item._id, fulfillmentStatus: status }, token);
    assert.equal((await update(order.items[1], 'processing', seller1.token)).status, 403);
    assert.equal((await update(order.items[0], 'delivered', seller1.token)).status, 409);
    assert.equal((await update(order.items[0], 'processing', seller1.token)).data.orderStatus, 'processing');
    assert.equal((await update(order.items[0], 'shipped', seller1.token)).data.orderStatus, 'processing');
    assert.equal((await update(order.items[1], 'cancelled', seller2.token)).data.orderStatus, 'shipped');
    const notices = await request('GET', '/auth/notifications', undefined, buyer.token);
    const cancelled = notices.data.items.find(item => item.message.includes('was cancelled'));
    assert.ok(cancelled); assert.match(cancelled.message, /Bulk Beans/); assert.match(cancelled.message, /Overall order status: shipped/);
    assert.equal((await request('PATCH', `/auth/notifications/${cancelled._id}/read`, {}, otherBuyer.token)).status, 404);
    assert.equal((await request('PATCH', `/auth/notifications/${cancelled._id}/read`, {}, buyer.token)).status, 200);
    assert.ok((await Notification.findById(cancelled._id)).readAt);
    const count = await Notification.countDocuments({ user: buyer.user._id, order: order._id });
    await update(order.items[1], 'cancelled', seller2.token);
    assert.equal(await Notification.countDocuments({ user: buyer.user._id, order: order._id }), count);
    const cancelledView = await request('GET', `/orders/${order._id}`, undefined, seller2.token);
    assert.equal(cancelledView.data.items[0].commissionAmount, 0);
    assert.equal(cancelledView.data.items[0].supplierNetAmount, 0);
    assert.deepEqual(cancelledView.data.supplierAmounts, { grossAmount: 0, commissionAmount: 0, supplierNetAmount: 0 });
    assert.equal((await Product.findById(p2._id)).stockQuantity, 20);
    await update(order.items[1], 'cancelled', seller2.token); assert.equal((await Product.findById(p2._id)).stockQuantity, 20);
    assert.equal((await update(order.items[0], 'delivered', seller1.token)).data.orderStatus, 'delivered');
  });
  await t.test('concurrent checkout cannot oversell', async () => {
    await request('PUT', `/products/${p1._id}`, { stockQuantity: 2 }, seller1.token);
    const payload = checkout([{ product: p1._id, quantity: 2 }]);
    const responses = await Promise.all([request('POST', '/orders', payload, buyer.token), request('POST', '/orders', payload, otherBuyer.token)]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]); assert.equal((await Product.findById(p1._id)).stockQuantity, 0);
    assert.equal(await Order.countDocuments(), 2);
  });
  await t.test('admin listings, suspension and supplier re-verification hide public products', async () => {
    for (const path of ['users', 'suppliers', 'products', 'orders']) assert.equal((await request('GET', '/admin/' + path, undefined, admin.token)).status, 200);
    assert.equal((await request('PATCH', `/admin/users/${seller1.user._id}/status`, { accountStatus: 'suspended' }, admin.token)).status, 200);
    assert.equal((await request('GET', `/products/${p1._id}`)).status, 404);
    await request('PUT', '/suppliers/me', { phone: '+254711111111' }, seller2.token);
    assert.equal((await request('GET', `/products/${p2._id}`)).status, 404);
    assert.equal((await request('POST', '/products', {}, seller2.token)).status, 403);
  });
});
test('overall order status rules', () => {
  for (const [states, expected] of [[['pending','pending'],'pending'],[['cancelled','cancelled'],'cancelled'],[['delivered','cancelled'],'delivered'],[['shipped','delivered'],'shipped'],[['pending','cancelled'],'processing']]) assert.equal(deriveStatus(states.map(fulfillmentStatus => ({ fulfillmentStatus }))), expected);
});


test('selling types, editing, legacy compatibility and checkout', async t => {
  const buyer = await register('selling-buyer');
  const supplierUser = await register('selling-supplier', 'supplier');
  const supplier = await Supplier.create({ user: supplierUser.user._id, companyName: 'Selling Types Test', address: 'Test address', phone: '0700000000', verificationStatus: 'approved' });
  const category = await Category.create({ name: 'Selling type fixtures' });
  const fields = { name: 'Bulk shirts', category: String(category._id), price: 5, stockQuantity: 100, images: [] };
  let bulk, single;
  await t.test('wholesale requires an integer minimum of at least two', async () => {
    for (const minimum of [undefined, 0, 1, 1.5]) {
      const result = await request('POST', '/products', { ...fields, sellingType: 'wholesale', ...(minimum === undefined ? {} : { minimumOrderQuantity: minimum }) }, supplierUser.token);
      assert.equal(result.status, 400);
    }
    const invalid = await request('POST', '/products', { ...fields, sellingType: 'retail' }, supplierUser.token); assert.equal(invalid.status, 400);
    const result = await request('POST', '/products', { ...fields, sellingType: 'wholesale', minimumOrderQuantity: 10 }, supplierUser.token);
    assert.equal(result.status, 201); bulk = result.data; assert.equal(bulk.minimumOrderQuantity, 10); assert.equal(bulk.sellingType, 'wholesale'); assert.equal(bulk.unit, 'piece');
  });
  await t.test('single items always normalize minimum to one', async () => {
    const result = await request('POST', '/products', { ...fields, name: 'Single handbag', sellingType: 'single', minimumOrderQuantity: 99 }, supplierUser.token);
    assert.equal(result.status, 201); single = result.data; assert.equal(single.minimumOrderQuantity, 1); assert.equal(single.sellingType, 'single');
    const updated = await request('PUT', `/products/${single._id}`, { minimumOrderQuantity: 50 }, supplierUser.token);
    assert.equal(updated.status, 200); assert.equal(updated.data.minimumOrderQuantity, 1);
    assert.equal((await Product.findById(single._id)).minimumOrderQuantity, 1);
  });
  await t.test('switching selling types validates bulk minimums and preserves units', async () => {
    assert.equal((await request('PUT', `/products/${single._id}`, { sellingType: 'wholesale' }, supplierUser.token)).status, 400);
    const bulkEdit = await request('PUT', `/products/${single._id}`, { sellingType: 'wholesale', minimumOrderQuantity: 5 }, supplierUser.token);
    assert.equal(bulkEdit.status, 200); assert.equal(bulkEdit.data.minimumOrderQuantity, 5);
    const singleEdit = await request('PUT', `/products/${single._id}`, { sellingType: 'single' }, supplierUser.token);
    assert.equal(singleEdit.status, 200); assert.equal(singleEdit.data.minimumOrderQuantity, 1);
  });
  await t.test('legacy records infer types without a migration or lost measurement units', async () => {
    for (const minimum of [1, 7]) {
      const raw = { supplier: supplier._id, category: category._id, name: `Legacy product ${minimum}`, price: 3, stockQuantity: 40, minimumOrderQuantity: minimum, unit: 'box', images: [], isActive: true, createdAt: new Date(), updatedAt: new Date() };
      const inserted = await Product.collection.insertOne(raw);
      const before = await request('GET', `/products/${inserted.insertedId}`);
      assert.equal(before.status, 200); assert.equal(before.data.sellingType, minimum === 1 ? 'single' : 'wholesale'); assert.equal(before.data.minimumOrderQuantity, minimum);
      const edit = await request('PUT', `/products/${inserted.insertedId}`, { price: 4 }, supplierUser.token);
      assert.equal(edit.status, 200); assert.equal(edit.data.unit, 'box'); assert.equal(edit.data.minimumOrderQuantity, minimum);
    }
    const legacyClient = await request('POST', '/products', { ...fields, unit: 'bag', minimumOrderQuantity: 4 }, supplierUser.token);
    assert.equal(legacyClient.status, 201); assert.equal(legacyClient.data.sellingType, 'wholesale'); assert.equal(legacyClient.data.unit, 'bag');
  });
  await t.test('checkout rejects bulk under minimum and accepts one or several single items', async () => {
    const checkout = items => ({ items, deliveryAddress: 'Selling types test shop', paymentMethod: 'cash_on_delivery' });
    const invalid = await request('POST', '/orders', checkout([{ product: bulk._id, quantity: 1 }]), buyer.token);
    assert.equal(invalid.status, 400); assert.equal((await Product.findById(bulk._id)).stockQuantity, 100);
    for (const quantity of [1, 3]) {
      const result = await request('POST', '/orders', checkout([{ product: single._id, quantity }]), buyer.token);
      assert.equal(result.status, 201); assert.equal(result.data.totalAmount, 5 * quantity);
    }
    const mixed = await request('POST', '/orders', checkout([{ product: bulk._id, quantity: 10 }, { product: single._id, quantity: 1 }]), buyer.token);
    assert.equal(mixed.status, 201); assert.equal(mixed.data.items.length, 2); assert.equal(mixed.data.totalAmount, 55);
    assert.equal((await Product.findById(bulk._id)).stockQuantity, 90); assert.equal((await Product.findById(single._id)).stockQuantity, 95);
  });
});

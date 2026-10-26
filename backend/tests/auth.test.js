import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { app } from '../server.js';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
let replica, server, base;
process.env.JWT_SECRET = 'isolated-auth-test-secret-at-least-32-characters';
before(async () => {
  const binary = 'C:/Program Files/MongoDB/Server/8.3/bin/mongod.exe';
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: existsSync(binary) ? { systemBinary: binary, version: '8.3.4' } : undefined });
  await connectDB(replica.getUri('registration_tests'));
  await User.init();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
}, { timeout: 180000 });
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); if (replica) await replica.stop(); });
async function post(path, values) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
  return { status: response.status, body: await response.json() };
}
const account = (email, role = 'buyer') => ({ name: '  Test Account  ', email, password: '  StrongPass123!  ', role });
for (const role of ['buyer', 'supplier']) test(`${role} registration persists hashed credentials and returns working JWT`, async () => {
  const values = account(`${role}@example.com`, role);
  const result = await post('/auth/register', values);
  assert.equal(result.status, 201);
  assert.equal(result.body.data.user.role, role);
  assert.equal(result.body.data.user.name, 'Test Account');
  assert.equal(result.body.data.user.password, undefined);
  const saved = await User.findById(result.body.data.user._id).select('+password');
  assert.ok(saved); assert.notEqual(saved.password, values.password);
  assert.equal(await bcrypt.compare(values.password, saved.password), true);
  assert.equal(await bcrypt.compare(values.password.trim(), saved.password), false);
  const me = await fetch(base + '/auth/me', { headers: { Authorization: `Bearer ${result.body.data.token}` } });
  assert.equal(me.status, 200);
  assert.equal((await post('/auth/login', { email: values.email, password: values.password })).status, 200);
  assert.equal((await post('/auth/login', { email: values.email, password: values.password.trim() })).status, 401);
});
test('duplicate email normalization and concurrent duplicate registration', async () => {
  const first = await post('/auth/register', account('  DuPlIcAtE@EXAMPLE.COM  ')); assert.equal(first.status, 201);
  const duplicate = await post('/auth/register', account('duplicate@example.com')); assert.equal(duplicate.status, 409); assert.equal(duplicate.body.message, 'Email already registered');
  const concurrent = await Promise.all([post('/auth/register', account('race@example.com')), post('/auth/register', account('race@example.com'))]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [201, 409]);
  assert.equal(concurrent.find(r => r.status === 409).body.message, 'Email already registered');
  assert.equal(await User.countDocuments({ email: 'race@example.com' }), 1);
});
test('missing fields, invalid email, invalid role and password byte limits create no users', async () => {
  const start = await User.countDocuments();
  const valid = account('invalid@example.com');
  for (const invalid of [{}, { ...valid, name: '  ' }, { ...valid, email: 'invalid-email' }, { ...valid, email: { $ne: null } }, { ...valid, password: 'short' }, { ...valid, password: 'é'.repeat(37) }, { ...valid, role: 'admin' }, { ...valid, accountStatus: 'active' }]) {
    const result = await post('/auth/register', invalid); assert.equal(result.status, 400); assert.equal(result.body.success, false); assert.ok(result.body.message);
  }
  assert.equal(await User.countDocuments(), start);
});
test('CORS allows both development loopback hosts and excludes unrelated origins', async () => {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://unrelated.example']) {
    const response = await fetch(base + '/auth/register', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
    assert.equal(response.headers.get('access-control-allow-origin'), origin.includes('unrelated') ? null : origin);
  }
});

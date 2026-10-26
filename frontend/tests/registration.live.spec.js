import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url));
const mongoose = backendRequire('mongoose');
const dotenv = backendRequire('dotenv');
const createdIds = [];
const prefix = `registration-check-${randomUUID()}`;
const emailFor = label => `${prefix}-${label}@example.test`;
const password = '  RegistrationPass123!  ';
test.beforeAll(async () => {
  const env = dotenv.parse(readFileSync(new URL('../../backend/.env', import.meta.url)));
  // This opt-in suite can write only to this project's local development database.
  if (!['127.0.0.1', 'localhost'].includes(new URL(env.MONGO_URI).hostname)) throw new Error('Live registration tests require a local development MongoDB URI');
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 3000 });
});
test.afterAll(async () => {
  // Remove only accounts created by this suite, never application users.
  if (createdIds.length) await mongoose.connection.db.collection('users').deleteMany({ _id: { $in: createdIds }, email: { $regex: `^${prefix}-` } });
  await mongoose.disconnect();
});
async function fillRegistration(page, email, role='buyer') {
  await page.goto('/register');
  await page.getByLabel('Full name').fill('Registration Test');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('I’m here to').selectOption(role);
}
for (const role of ['buyer','supplier']) test(`real ${role} signup saves MongoDB user and redirects`, async ({ page }) => {
  const email=emailFor(role);
  await fillRegistration(page,email,role);
  const registration = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Create your account'}).click();
  const response=await registration;
  expect(response.status()).toBe(201);
  const body=await response.json();
  const saved=await mongoose.connection.db.collection('users').findOne({email});
  if(saved) createdIds.push(saved._id);
  expect(saved).toBeTruthy(); expect(saved.role).toBe(role); expect(saved.password).not.toBe(password); expect(body.data.user.password).toBeUndefined();
  await expect(page).toHaveURL(role==='buyer' ? '/shop' : '/supplier/dashboard');
  expect(await page.evaluate(() => sessionStorage.getItem('p2p-token'))).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('link',{name:'Account',exact:true})).toHaveAttribute('href','/account');
});
test('duplicate email is displayed without another account being created', async ({page,request}) => {
  const email=emailFor('duplicate');
  const result=await request.post('http://localhost:5000/api/auth/register',{data:{name:'Duplicate Test',email,password,role:'buyer'}}); expect(result.status()).toBe(201);
  const saved=await mongoose.connection.db.collection('users').findOne({email}); createdIds.push(saved._id);
  await fillRegistration(page,email);
  await page.getByRole('button',{name:'Create your account'}).click();
  await expect(page.getByRole('alert')).toHaveText('Email already registered');
  await expect(page).toHaveURL('/register'); expect(await mongoose.connection.db.collection('users').countDocuments({email})).toBe(1);
});
test('missing fields, invalid email and oversized UTF-8 password prevent submission', async ({page}) => {
  let submitted=0; page.on('request',r => {if(r.url().endsWith('/api/auth/register') && r.method()==='POST') submitted++;});
  await page.goto('/register'); await page.getByRole('button',{name:'Create your account'}).click();
  expect(await page.getByLabel('Full name').evaluate(input=>input.validity.valueMissing)).toBe(true);
  await fillRegistration(page,emailFor('invalid'));
  await page.getByLabel('Email address').fill('invalid-email'); await page.getByRole('button',{name:'Create your account'}).click();
  expect(await page.getByLabel('Email address').evaluate(input=>input.validity.typeMismatch)).toBe(true);
  await page.getByLabel('Email address').fill(emailFor('invalid')); await page.getByLabel('Password',{exact:true}).fill('é'.repeat(37));
  await page.getByRole('button',{name:'Create your account'}).click();
  await expect(page.getByRole('alert')).toContainText('at most 72 UTF-8 bytes'); expect(submitted).toBe(0);
});
test('registration network failures display actionable feedback', async ({page}) => {
  await page.route('**/api/auth/register',route=>route.abort());
  await fillRegistration(page,emailFor('network'));
  await page.getByRole('button',{name:'Create your account'}).click();
  await expect(page.getByRole('alert')).toContainText('Cannot connect to the marketplace server');
  await expect(page.getByRole('button',{name:'Create your account'})).toBeEnabled();
  expect(await mongoose.connection.db.collection('users').countDocuments({email:emailFor('network')})).toBe(0);
});

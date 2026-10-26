import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { id } from '../utils/helpers.js';
import generateToken from '../utils/generateToken.js';
import { body, text, fail, ok } from '../utils/helpers.js';

function emailAddress(value) {
  const email = text(value, 'Email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address');
  return email;
}
function passwordValue(value, registering = false) {
  if (typeof value !== 'string' || !value.trim()) fail(400, 'Password is required');
  if (Buffer.byteLength(value, 'utf8') > 72 || (registering && value.length < 8)) {
    fail(400, 'Password must be at least 8 characters and at most 72 UTF-8 bytes');
  }
  // Never trim a password: bcrypt must receive exactly what the user entered.
  return value;
}
export async function register(req, res) {
  const b = body(req, ['name', 'email', 'password', 'role']);
  const role = b.role ?? 'buyer';
  if (!['buyer', 'supplier'].includes(role)) fail(400, 'Registration role must be buyer or supplier');
  const name = text(b.name, 'Name', 120);
  const email = emailAddress(b.email);
  const password = passwordValue(b.password, true);
  if (await User.exists({ email })) fail(409, 'Email already registered');
  const user = new User({ name, email, password, role });
  // Fail before creating the account if token signing is not configured.
  const token = generateToken(user);
  await user.save();
  ok(res, { user, token }, 'Registered successfully', 201);
}
export async function login(req, res) {
  const b = body(req, ['email', 'password']);
  const email = emailAddress(b.email);
  const password = passwordValue(b.password);
  const user = await User.findOne({ email }).select('+password');
  if (!user || !await bcrypt.compare(password, user.password)) fail(401, 'Invalid email or password');
  if (user.accountStatus !== 'active') fail(403, 'Account suspended');
  ok(res, { user, token: generateToken(user) }, 'Logged in successfully');
}
export const me = (req, res) => ok(res, req.user);
export async function notifications(req, res) {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1, _id: -1 }).limit(30),
    Notification.countDocuments({ user: req.user._id, readAt: null })
  ]);
  ok(res, { items, unreadCount });
}
export async function readNotification(req, res) {
  const notification = await Notification.findOneAndUpdate({ _id: id(req.params.id), user: req.user._id, readAt: null }, { $set: { readAt: new Date() } }, { returnDocument: 'after' });
  if (!notification && !await Notification.exists({ _id: req.params.id, user: req.user._id })) fail(404, 'Notification not found');
  ok(res, {}, 'Notification read');
}

import dotenv from 'dotenv';
import User from './models/User.js';
dotenv.config({ path: new URL('./.env', import.meta.url), quiet: true });
import express from 'express';
import cors from 'cors';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { uploadDirectory } from './middleware/productImages.js';
import auth from './routes/authRoutes.js';
import products from './routes/productRoutes.js';
import categories from './routes/categoryRoutes.js';
import suppliers from './routes/supplierRoutes.js';
import orders from './routes/orderRoutes.js';
import admin from './routes/adminRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
export const app = express();
app.disable('x-powered-by');
const clientOrigin = new URL(process.env.CLIENT_URL || 'http://localhost:5173');
const allowedOrigins = new Set([clientOrigin.origin]);
if (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(clientOrigin.hostname)) {
  const alias = new URL(clientOrigin);
  alias.hostname = clientOrigin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  allowedOrigins.add(alias.origin);
}
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(fileURLToPath(uploadDirectory), {
  dotfiles: 'deny',
  setHeaders(res) { res.setHeader('X-Content-Type-Options', 'nosniff'); }
}));
app.get('/api/health', (_req, res) => res.json({ success: true, message: 'YouSupply API is running' }));
app.use('/api/auth', auth); app.use('/api/products', products); app.use('/api/categories', categories);
app.use('/api/suppliers', suppliers); app.use('/api/orders', orders); app.use('/api/admin', admin);
app.use(notFound); app.use(errorHandler);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'replace_with_a_secure_random_secret') throw new Error('Configure a random JWT_SECRET of at least 32 characters');
    await connectDB();
    await User.init(); // Ensure the unique email index exists before accepting registrations.
    app.listen(process.env.PORT || 5000, () => console.log(`YouSupply API listening on port ${process.env.PORT || 5000}`));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['buyer', 'supplier', 'admin'], default: 'buyer' },
  accountStatus: { type: String, enum: ['active', 'suspended'], default: 'active' },
  supplierVerificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
  supplierVerificationNotification: { type: new mongoose.Schema({ status: String, message: String, createdAt: Date }, { _id: false }), default: undefined }
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.password; return ret; } } });
schema.pre('save', async function () {
  if (this.isModified('password')) {
    if (this.password.length < 8 || Buffer.byteLength(this.password) > 72) throw Object.assign(new Error('Password must be at least 8 characters and at most 72 bytes'), { status: 400 });
    this.password = await bcrypt.hash(this.password, 12);
  }
});
export default mongoose.model('User', schema);

import mongoose from 'mongoose';
export default mongoose.model('Supplier', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, required: true, trim: true, maxlength: 200 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  image: { type: String, default: '', validate: { validator: value => !value || (/^https?:\/\//.test(value) || /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(value)) && value.length <= 2048, message: 'Choose an uploaded shop image' } },
  address: { type: String, required: true, trim: true, maxlength: 1000 },
  phone: { type: String, required: true, trim: true, maxlength: 40 },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  verificationNotification: { type: new mongoose.Schema({
    status: { type: String, enum: ['pending', 'approved', 'rejected'], required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, required: true }
  }, { _id: false }), default: undefined }
}, { timestamps: true }));

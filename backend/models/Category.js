import mongoose from 'mongoose';
export default mongoose.model('Category', new mongoose.Schema({
  name: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 2000 }
}, { timestamps: true }));

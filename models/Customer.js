const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    address: { type: String, trim: true, default: '', maxlength: 500 },
    balance: { type: Number, default: 0 } // positive means they owe us (Lena hai), negative means advance jama hai
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Customer', customerSchema);

const mongoose = require('mongoose');

const customerTransactionSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  type: { type: String, enum: ['sale', 'payment'], required: true }, // 'sale' = Daig / Samaan Bheja, 'payment' = Wasooli / Payment Aayi
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  amount: { type: Number, required: true, min: 0.01 },
  details: { type: String, trim: true, default: '' },
  date: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

customerTransactionSchema.index({ customer: 1, date: -1 });

module.exports = mongoose.model('CustomerTransaction', customerTransactionSchema);

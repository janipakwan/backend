const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { type: String, trim: true, maxlength: 500 },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  amount: { type: Number, required: true, min: 0.01 },
  paidBy: { type: String, enum: ['sale', 'owner_advance'], required: true },
  date: { type: Date, required: true, default: Date.now },
  ownerAdvance: { type: mongoose.Schema.Types.ObjectId, ref: 'OwnerAdvance', default: null }
}, { timestamps: true });

expenseSchema.index({ date: -1 });
module.exports = mongoose.model('Expense', expenseSchema);

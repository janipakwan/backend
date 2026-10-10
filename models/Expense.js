const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  description: { type: String, trim: true, maxlength: 500 },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }],
  amount: { type: Number, required: true, min: 0.01 },
  type: { type: String, enum: ['expense', 'income'], default: 'expense' },
  paidBy: { type: String, enum: ['sale', 'none'], default: 'sale' },
  date: { type: Date, required: true, default: Date.now }
}, { timestamps: true });


expenseSchema.index({ date: -1 });
module.exports = mongoose.model('Expense', expenseSchema);

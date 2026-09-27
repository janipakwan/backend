const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    amountPaid: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, default: Date.now },
    method: { type: String, enum: ['cash', 'bank_transfer', 'other'], default: 'cash' }
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1, paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);

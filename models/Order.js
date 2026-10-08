const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    degType: { type: mongoose.Schema.Types.ObjectId, ref: 'Deg' },
    itemName: { type: String, trim: true },
    quantity: { type: Number, min: 1 },
    pricePerDeg: { type: Number, min: 0 },
    items: [{
      name: { type: String, required: true },
      details: { type: String, trim: true, default: '' },
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true, min: 0 }
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    advancePaid: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'partially_paid', 'paid', 'delivered'], default: 'pending' },
    notes: { type: String, trim: true, default: '', maxlength: 1000 },
    orderNumber: { type: Number, unique: true, sparse: true }
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, orderDate: -1 });
orderSchema.index({ dueAmount: 1, orderDate: 1 });

module.exports = mongoose.model('Order', orderSchema);

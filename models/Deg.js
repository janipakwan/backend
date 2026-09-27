const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  { price: { type: Number, required: true, min: 0 }, changedAt: { type: Date, default: Date.now } },
  { _id: false }
);

const degSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    currentPrice: { type: Number, required: true, min: 0 },
    priceHistory: { type: [priceHistorySchema], default: [] },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Deg', degSchema);

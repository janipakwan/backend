const mongoose = require('mongoose');

const ownerAdvanceSchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0.01 },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  date: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['pending', 'cleared'], default: 'pending' },
  clearedDate: { type: Date, default: null },
  clearedAmount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });

ownerAdvanceSchema.index({ status: 1, date: -1 });
module.exports = mongoose.model('OwnerAdvance', ownerAdvanceSchema);

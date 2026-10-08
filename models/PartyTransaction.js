const mongoose = require('mongoose');

const partyTransactionSchema = new mongoose.Schema({
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  type: { type: String, enum: ['purchase', 'payment'], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  details: { type: String, trim: true },
  date: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

partyTransactionSchema.index({ party: 1, date: -1 });

module.exports = mongoose.model('PartyTransaction', partyTransactionSchema);

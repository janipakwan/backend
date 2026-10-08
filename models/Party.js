const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: '' },
  balance: { type: Number, default: 0 } // positive means we owe them, negative means they owe us
}, { timestamps: true });

module.exports = mongoose.model('Party', partySchema);

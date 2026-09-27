const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  adminEmail: { type: String, trim: true, default: '' },
  reminderTime: { type: String, trim: true, default: '20:00' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);

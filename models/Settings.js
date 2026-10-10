const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  shopName: { type: String, trim: true, default: 'جانی پکوان سینٹر' },
  ownerName: { type: String, trim: true, default: 'محمد اعظم جٹ' },
  proprietorInfo: { type: String, trim: true, default: 'پروپرائٹر حاجی رمضان عرف جانی | ایم اعظم' },
  phone1: { type: String, trim: true, default: '0300-9664026' },
  phone2: { type: String, trim: true, default: '0322-9664026' },
  address: { type: String, trim: true, default: 'نزد ریلوے پھاٹک، رینالہ خورد' },
  tagline: { type: String, trim: true, default: 'اخلاق ہمارا منافع | ایمانداری ہمارا نصب العین' },
  receiptFooter: { type: String, trim: true, default: 'نوٹ: گوشت کا ریٹ منڈی کے حساب سے لیا جائے گا۔ رکشہ کرایہ بذمہ گاہک ہو گا۔' }
}, { timestamps: true });


module.exports = mongoose.model('Settings', settingsSchema);


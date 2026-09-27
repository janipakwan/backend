/**
 * One-time migration script: backfills orderNumber for all existing orders.
 * Orders are sorted by orderDate ascending and assigned sequential numbers starting at 1.
 * After backfilling, the Counter document is set to the final count so new orders continue correctly.
 *
 * Usage:  node scripts/backfillOrderNumbers.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Counter = require('../models/Counter');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find all orders without an orderNumber, sorted by orderDate ascending
  const orders = await Order.find({ orderNumber: { $exists: false } }).sort({ orderDate: 1 });

  if (orders.length === 0) {
    console.log('No orders to backfill — all orders already have orderNumber.');
    await mongoose.disconnect();
    return;
  }

  // Find the current max orderNumber already assigned (in case of partial runs)
  const maxExisting = await Order.findOne({ orderNumber: { $exists: true } }).sort({ orderNumber: -1 });
  let nextNumber = maxExisting ? maxExisting.orderNumber + 1 : 1;

  console.log(`Backfilling ${orders.length} orders starting at orderNumber ${nextNumber}...`);

  for (const order of orders) {
    order.orderNumber = nextNumber;
    await order.save();
    console.log(`  Order ${order._id} → #${String(nextNumber).padStart(4, '0')} (date: ${order.orderDate.toISOString().slice(0, 10)})`);
    nextNumber++;
  }

  // Update the counter so new orders continue from the correct next number
  const finalCount = nextNumber - 1;
  await Counter.findOneAndUpdate(
    { name: 'orderNumber' },
    { value: finalCount },
    { upsert: true }
  );

  console.log(`\nDone! Backfilled ${orders.length} orders. Counter set to ${finalCount}.`);
  console.log('New orders will start at #' + String(finalCount + 1).padStart(4, '0'));
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

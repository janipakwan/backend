/**
 * Full Database Reset Script
 * Deletes ALL data from every collection (except Users and Settings)
 * and resets the order counter to 0.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const Expense = require('../models/Expense');
const Party = require('../models/Party');
const PartyTransaction = require('../models/PartyTransaction');
const Counter = require('../models/Counter');


async function resetAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...\n');

    const results = [];

    // Delete all orders
    let r = await Order.deleteMany({});
    results.push(`Orders:            ${r.deletedCount} deleted`);

    // Delete all customers
    r = await Customer.deleteMany({});
    results.push(`Customers:         ${r.deletedCount} deleted`);

    // Delete all payments
    r = await Payment.deleteMany({});
    results.push(`Payments:          ${r.deletedCount} deleted`);

    // Delete all expenses
    r = await Expense.deleteMany({});
    results.push(`Expenses:          ${r.deletedCount} deleted`);

    // Delete all parties
    r = await Party.deleteMany({});
    results.push(`Parties:           ${r.deletedCount} deleted`);

    // Delete all party transactions
    r = await PartyTransaction.deleteMany({});
    results.push(`PartyTransactions: ${r.deletedCount} deleted`);


    // Reset counter to 0
    r = await Counter.updateMany({}, { $set: { value: 0 } });
    results.push(`Counters:          ${r.modifiedCount} reset to 0`);

    console.log('=== FULL RESET COMPLETE ===');
    results.forEach(line => console.log('  ' + line));
    console.log('\nSab kuch zero ho gaya! ✅');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Reset failed:', err.message);
    process.exit(1);
  }
}

resetAll();

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

exports.listCustomers = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const filter = search ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] } : {};
    const customers = await Customer.find(filter).sort({ name: 1 }).limit(200);
    res.json({ customers });
  } catch (error) { next(error); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const phone = req.body.phone?.trim();
    const openingBalance = Number(req.body.balance) || 0;
    if (!name || !phone) return res.status(400).json({ message: 'Customer name and phone are required.' });
    
    const customer = await Customer.create({
      name,
      phone,
      address: req.body.address?.trim() || '',
      balance: openingBalance
    });

    // If opening balance was provided and not 0, create an initial ledger entry
    if (openingBalance !== 0) {
      await CustomerTransaction.create({
        customer: customer._id,
        type: openingBalance > 0 ? 'sale' : 'payment',
        amount: Math.abs(openingBalance),
        details: openingBalance > 0 ? 'Sabqa Baqaya (Opening Balance)' : 'Advance Jama (Opening Balance)',
        date: new Date()
      });
    }

    res.status(201).json({ customer });
  } catch (error) { next(error); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    // Customer ledger transactions
    const transactions = await CustomerTransaction.find({ customer: customer._id }).sort({ date: -1, createdAt: -1 });

    // Existing orders and payments for this customer
    const orders = await Order.find({ customer: customer._id }).sort({ orderDate: -1 });

    // Detect orders already posted to khata to sync status and prevent duplicates
    const postedOrderIds = new Set();
    const postedOrderNumbers = new Set();
    transactions.forEach(t => {
      if (t.order) postedOrderIds.add(t.order.toString());
      if (t.details) {
        const match = t.details.match(/Booking Order\s*#?(\d+)/i);
        if (match) postedOrderNumbers.add(Number(match[1]));
      }
    });

    for (const order of orders) {
      const isLinked = postedOrderIds.has(order._id.toString()) || (order.orderNumber && postedOrderNumbers.has(order.orderNumber));
      if (!order.addedToLedger && isLinked) {
        order.addedToLedger = true;
        order.status = 'transferred_to_ledger';
        order.addedToLedgerAt = order.updatedAt || new Date();
        await Order.updateOne(
          { _id: order._id },
          { $set: { addedToLedger: true, status: 'transferred_to_ledger', addedToLedgerAt: order.addedToLedgerAt } }
        );
      }
    }

    const orderIds = orders.map((order) => order._id);
    const payments = await Payment.find({ order: { $in: orderIds } }).sort({ paymentDate: -1 });

    res.json({ customer, transactions, orders, payments });
  } catch (error) { next(error); }
};

exports.addCustomerTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const customerId = req.params.id;
    const { type, details, date } = req.body;
    let items = req.body.items || [];
    let amt = 0;

    if (!['sale', 'payment'].includes(type)) {
      return res.status(400).json({ message: 'Invalid transaction type.' });
    }

    if (type === 'sale' && items.length > 0) {
      items.forEach((item, idx) => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price);
        if (!Number.isFinite(price) || price < 0) {
          throw Object.assign(new Error(`Item ${idx + 1}: Price cannot be negative.`), { statusCode: 400 });
        }
        item.quantity = qty;
        item.price = price;
        amt += price * qty;
      });
    } else {
      amt = Number(req.body.amount);
      items = [];
    }

    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Valid amount or items with price are required.' });
    }

    let updatedCustomer;
    let transaction;

    await session.withTransaction(async () => {
      const customer = await Customer.findById(customerId).session(session);
      if (!customer) throw Object.assign(new Error('Customer not found.'), { statusCode: 404 });

      transaction = await CustomerTransaction.create([{
        customer: customer._id,
        type,
        items,
        amount: amt,
        details: details?.trim() || '',
        date: date ? new Date(date) : new Date()
      }], { session });

      // If sale (Daig/Samaan bheja), balance increases (customer owes us more).
      // If payment (Wasooli), balance decreases.
      customer.balance = (Number(customer.balance) || 0) + (type === 'sale' ? amt : -amt);
      await customer.save({ session });
      updatedCustomer = customer;
    });

    res.status(201).json({ transaction: transaction[0], customer: updatedCustomer });
  } catch (error) { next(error); } finally { await session.endSession(); }
};

exports.updateCustomerTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let updatedCustomer;
    let updatedTxn;
    await session.withTransaction(async () => {
      const txn = await CustomerTransaction.findById(req.params.txnId).session(session);
      if (!txn) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 });

      const type = req.body.type || txn.type;
      let items = req.body.items || [];
      let amt = 0;

      if (type === 'sale' && items.length > 0) {
        items.forEach((item, idx) => {
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price);
          if (!Number.isFinite(price) || price < 0) {
            throw Object.assign(new Error(`Item ${idx + 1}: Price cannot be negative.`), { statusCode: 400 });
          }
          item.quantity = qty;
          item.price = price;
          amt += price * qty;
        });
      } else {
        amt = Number(req.body.amount !== undefined ? req.body.amount : txn.amount);
      }

      if (!['sale', 'payment'].includes(type) || !Number.isFinite(amt) || amt <= 0) {
        throw Object.assign(new Error('Valid type and positive amount are required.'), { statusCode: 400 });
      }

      txn.type = type;
      txn.items = items;
      txn.amount = amt;
      if (req.body.details !== undefined) txn.details = req.body.details.trim();
      if (req.body.date) txn.date = new Date(req.body.date);
      await txn.save({ session });
      updatedTxn = txn;

      const customer = await Customer.findById(txn.customer).session(session);
      if (customer) {
        const all = await CustomerTransaction.find({ customer: customer._id }).session(session);
        customer.balance = all.reduce((sum, t) => sum + (t.type === 'sale' ? t.amount : -t.amount), 0);
        await customer.save({ session });
        updatedCustomer = customer;
      }
    });

    res.json({ transaction: updatedTxn, customer: updatedCustomer });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally {
    await session.endSession();
  }
};

exports.deleteCustomerTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let updatedCustomer;
    await session.withTransaction(async () => {
      const txn = await CustomerTransaction.findByIdAndDelete(req.params.txnId).session(session);
      if (!txn) throw Object.assign(new Error('Transaction not found.'), { statusCode: 404 });

      const customer = await Customer.findById(txn.customer).session(session);
      if (customer) {
        const all = await CustomerTransaction.find({ customer: customer._id }).session(session);
        customer.balance = all.reduce((sum, t) => sum + (t.type === 'sale' ? t.amount : -t.amount), 0);
        await customer.save({ session });
        updatedCustomer = customer;
      }
    });
    res.json({ message: 'Transaction deleted.', customer: updatedCustomer });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally { await session.endSession(); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    if (req.body.name) customer.name = req.body.name.trim();
    if (req.body.phone !== undefined) customer.phone = req.body.phone.trim();
    if (req.body.address !== undefined) customer.address = req.body.address.trim();
    await customer.save();
    res.json({ customer });
  } catch (error) { next(error); }
};

exports.deleteCustomer = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const customer = await Customer.findById(req.params.id).session(session);
      if (!customer) throw Object.assign(new Error('Customer not found.'), { statusCode: 404 });

      // Find all orders of this customer
      const orders = await Order.find({ customer: customer._id }).session(session).select('_id');
      const orderIds = orders.map(o => o._id);

      // Delete all payments linked to these orders
      if (orderIds.length > 0) {
        await Payment.deleteMany({ order: { $in: orderIds } }).session(session);
      }

      // Delete all orders of this customer
      await Order.deleteMany({ customer: customer._id }).session(session);

      // Delete all customer ledger transactions
      await CustomerTransaction.deleteMany({ customer: customer._id }).session(session);

      // Delete the customer
      await Customer.findByIdAndDelete(req.params.id).session(session);
    });

    res.json({ message: 'Customer and all related records deleted successfully.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally { await session.endSession(); }
};

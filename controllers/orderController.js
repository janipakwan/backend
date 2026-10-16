const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const CustomerTransaction = require('../models/CustomerTransaction');
const Deg = require('../models/Deg');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { recalculateOrderPaymentState } = require('../utils/orderPayments');
const { getNextSequence } = require('../utils/counter');

const syncOrderToLedger = async (order, customer, session) => {
  const items = (order.items && order.items.length > 0)
    ? order.items.map(i => ({ name: i.name, quantity: i.quantity || 1, price: i.price }))
    : [{ name: order.itemName || 'Booking Deg', quantity: order.quantity || 1, price: order.pricePerDeg || order.totalAmount }];

  const orderLabel = order.orderNumber ? `#${String(order.orderNumber).padStart(4, '0')}` : '';

  // 1. Create Sale transaction
  await CustomerTransaction.create([{
    customer: customer._id,
    order: order._id,
    type: 'sale',
    items,
    amount: order.totalAmount,
    details: `Booking Order ${orderLabel} ka Bill`.trim(),
    date: order.deliveryDate || order.orderDate || new Date()
  }], { session });

  let netBalanceChange = order.totalAmount;

  // 2. If advance was paid, record payment transaction
  if (order.advancePaid && order.advancePaid > 0) {
    await CustomerTransaction.create([{
      customer: customer._id,
      order: order._id,
      type: 'payment',
      amount: order.advancePaid,
      details: `Booking Order ${orderLabel} Advance Wasooli`.trim(),
      date: order.orderDate || new Date()
    }], { session });

    netBalanceChange -= order.advancePaid;
  }

  // 3. Update customer khata balance
  customer.balance = (Number(customer.balance) || 0) + netBalanceChange;
  await customer.save({ session });

  // 4. Mark order as addedToLedger
  order.addedToLedger = true;
  order.addedToLedgerAt = new Date();
  order.status = 'transferred_to_ledger';
  await order.save({ session });
};

exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    const quantity = Number(req.body.quantity);
    const advancePaid = Number(req.body.advancePaid || 0);

    if (!Number.isFinite(advancePaid) || advancePaid < 0) return res.status(400).json({ message: 'Advance payment cannot be negative.' });
    if (!req.body.deliveryDate || Number.isNaN(new Date(req.body.deliveryDate).getTime())) return res.status(400).json({ message: 'A valid delivery date is required.' });

    let result;
    await session.withTransaction(async () => {
      let customer;
      if (req.body.customerId) {
        customer = await Customer.findById(req.body.customerId).session(session);
        if (!customer) throw Object.assign(new Error('Selected customer not found.'), { statusCode: 404 });
      } else {
        const name = req.body.customer?.name?.trim();
        const phone = req.body.customer?.phone?.trim();
        const phone2 = req.body.customer?.phone2?.trim() || '';
        const openingBalance = Number(req.body.customer?.openingBalance) || 0;
        if (!name || !phone) throw Object.assign(new Error('Select an existing customer or enter a new customer name and phone.'), { statusCode: 400 });
        
        customer = await Customer.create([{ 
          name, 
          phone, 
          phone2, 
          address: req.body.customer.address?.trim() || '',
          balance: openingBalance
        }], { session }).then(([entry]) => entry);

        if (openingBalance !== 0) {
          await CustomerTransaction.create([{
            customer: customer._id,
            type: openingBalance > 0 ? 'sale' : 'payment',
            amount: Math.abs(openingBalance),
            details: openingBalance > 0 ? 'Sabqa Baqaya (Opening Balance)' : 'Advance Jama (Opening Balance)',
            date: new Date()
          }], { session });
        }
      }

      let items = req.body.items || [];
      
      // Fallback if they send legacy itemName
      if (items.length === 0 && req.body.itemName) {
        items = [{
          name: req.body.itemName?.trim() || 'Item',
          price: Number(req.body.pricePerUnit) || 0,
          quantity: Number(req.body.quantity) || 1
        }];
      }

      if (items.length === 0) throw Object.assign(new Error('At least one item is required.'), { statusCode: 400 });

      let totalAmount = 0;
      items.forEach((item, idx) => {
        const qty = Number(item.quantity);
        const price = Number(item.price) || 0;
        if (!Number.isFinite(price) || price < 0) throw Object.assign(new Error(`Item ${idx + 1}: Price cannot be negative.`), { statusCode: 400 });
        if (!Number.isFinite(qty) || qty < 1) throw Object.assign(new Error(`Item ${idx + 1}: Quantity must be at least 1.`), { statusCode: 400 });
        item.quantity = qty;
        item.price = price;
        totalAmount += price * qty;
      });

      if (advancePaid > totalAmount) throw Object.assign(new Error('Advance payment cannot exceed the order total.'), { statusCode: 400 });

      const orderNumber = await getNextSequence('orderNumber');

      const [order] = await Order.create([{
        customer: customer._id,
        items,
        totalAmount,
        advancePaid,
        dueAmount: totalAmount,
        deliveryDate: new Date(req.body.deliveryDate),
        notes: req.body.notes?.trim() || '',
        orderNumber
      }], { session });

      if (advancePaid > 0) {
        await Payment.create([{ order: order._id, customer: customer._id, amountPaid: advancePaid, method: req.body.advanceMethod || 'cash' }], { session });
        await recalculateOrderPaymentState(order._id, session);
      }

      // Automatically add order into Customer Khata (Ledger)
      await syncOrderToLedger(order, customer, session);

      result = await Order.findById(order._id).populate('customer', 'name phone phone2 address balance').session(session);
    });
    res.status(201).json({ order: result });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally { await session.endSession(); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone phone2 address');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const payments = await Payment.find({ order: order._id }).sort({ paymentDate: 1 });
    res.json({ order, payments });
  } catch (error) {
    next(error);
  }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (req.body.notes !== undefined) order.notes = req.body.notes?.trim() || '';
    if (req.body.deliveryDate) order.deliveryDate = new Date(req.body.deliveryDate);

    // Update items and recalculate total if provided
    if (req.body.items && req.body.items.length > 0) {
      let total = 0;
      const items = req.body.items.map(item => {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        total += qty * price;
        return {
          name: item.name?.trim() || 'Item',
          quantity: qty,
          price,
          details: item.details?.trim() || ''
        };
      });
      order.items = items;
      order.totalAmount = total;
    }

    await order.save();
    await recalculateOrderPaymentState(order._id);

    const populated = await Order.findById(order._id).populate('customer', 'name phone phone2 address');
    res.json({ order: populated });
  } catch (error) { next(error); }
};

exports.deleteOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const order = await Order.findByIdAndDelete(req.params.id).session(session);
      if (!order) throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
      await Payment.deleteMany({ order: order._id }).session(session);

      // Clean up linked transactions in Customer Khata if present
      const linkedTxns = await CustomerTransaction.find({ order: order._id }).session(session);
      if (linkedTxns.length > 0) {
        await CustomerTransaction.deleteMany({ order: order._id }).session(session);
        const customer = await Customer.findById(order.customer).session(session);
        if (customer) {
          const all = await CustomerTransaction.find({ customer: customer._id }).session(session);
          customer.balance = all.reduce((sum, t) => sum + (t.type === 'sale' ? t.amount : -t.amount), 0);
          await customer.save({ session });
        }
      }
    });
    res.json({ message: 'Order deleted successfully.' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally { await session.endSession(); }
};

exports.addOrderToLedger = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    let resultOrder;
    let resultCustomer;

    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);
      if (!order) {
        throw Object.assign(new Error('Order nahi mila.'), { statusCode: 404 });
      }

      if (order.addedToLedger) {
        throw Object.assign(new Error('Yeh order pehle hi Khata me shamil ho chuka hai.'), { statusCode: 400 });
      }

      const orderNumPattern = order.orderNumber ? `Order #${String(order.orderNumber).padStart(4, '0')}` : null;
      const existingQuery = [{ order: order._id }];
      if (orderNumPattern) {
        existingQuery.push({
          customer: order.customer,
          details: new RegExp(orderNumPattern, 'i')
        });
      }

      const existingTxn = await CustomerTransaction.findOne({ $or: existingQuery }).session(session);
      if (existingTxn) {
        order.addedToLedger = true;
        order.addedToLedgerAt = order.addedToLedgerAt || new Date();
        order.status = 'transferred_to_ledger';
        await order.save({ session });
        throw Object.assign(new Error('Yeh order pehle hi Khata me shamil ho chuka hai.'), { statusCode: 400 });
      }

      const customer = await Customer.findById(order.customer).session(session);
      if (!customer) {
        throw Object.assign(new Error('Customer nahi mila.'), { statusCode: 404 });
      }

      await syncOrderToLedger(order, customer, session);

      resultOrder = order;
      resultCustomer = customer;
    });

    res.json({
      message: 'Order kamyabi se Khata me shamil ho gaya! ✅',
      order: resultOrder,
      customer: resultCustomer
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    next(error);
  } finally {
    await session.endSession();
  }
};



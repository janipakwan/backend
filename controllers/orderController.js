const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Deg = require('../models/Deg');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { recalculateOrderPaymentState } = require('../utils/orderPayments');
const { getNextSequence } = require('../utils/counter');

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
        if (!name || !phone) throw Object.assign(new Error('Select an existing customer or enter a new customer name and phone.'), { statusCode: 400 });
        customer = await Customer.create([{ name, phone, address: req.body.customer.address?.trim() || '' }], { session }).then(([entry]) => entry);
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
        const price = Number(item.price);
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
      result = await Order.findById(order._id).populate('customer', 'name phone address').session(session);
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
      .populate('customer', 'name phone address');
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const payments = await Payment.find({ order: order._id }).sort({ paymentDate: 1 });
    res.json({ order, payments });
  } catch (error) {
    next(error);
  }
};

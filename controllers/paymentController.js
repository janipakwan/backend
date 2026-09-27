const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { recalculateOrderPaymentState } = require('../utils/orderPayments');

exports.listOutstandingOrders = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    let customerFilter = {};
    if (search) {
      const customers = await Customer.find({ $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] }).select('_id');
      customerFilter = { customer: { $in: customers.map((customer) => customer._id) } };
    }
    const orders = await Order.find({ dueAmount: { $gt: 0 }, ...customerFilter }).populate('customer', 'name phone').populate('degType', 'name').sort({ orderDate: 1 });
    res.json({ orders });
  } catch (error) { next(error); }
};

exports.createPayment = async (req, res, next) => {
  try {
    const amountPaid = Number(req.body.amountPaid);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) return res.status(400).json({ message: 'Enter a payment amount greater than zero.' });
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (amountPaid > order.dueAmount) return res.status(400).json({ message: 'Payment cannot exceed the remaining due amount.' });
    const paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
    if (Number.isNaN(paymentDate.getTime())) return res.status(400).json({ message: 'Enter a valid payment date.' });
    const method = req.body.method || 'cash';
    if (!['cash', 'bank_transfer', 'other'].includes(method)) return res.status(400).json({ message: 'Enter a valid payment method.' });
    const payment = await Payment.create({ order: order._id, customer: order.customer, amountPaid, paymentDate, method });
    const updatedOrder = await recalculateOrderPaymentState(order._id);
    res.status(201).json({ payment, order: updatedOrder });
  } catch (error) { next(error); }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found.' });
    await Payment.deleteOne({ _id: payment._id });
    const order = await recalculateOrderPaymentState(payment.order);
    res.json({ message: 'Payment deleted and order balance recalculated.', order });
  } catch (error) { next(error); }
};

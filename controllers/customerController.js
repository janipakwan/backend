const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

exports.listCustomers = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    const filter = search ? { $or: [{ name: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }] } : {};
    const customers = await Customer.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ customers });
  } catch (error) { next(error); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const phone = req.body.phone?.trim();
    if (!name || !phone) return res.status(400).json({ message: 'Customer name and phone are required.' });
    const customer = await Customer.create({ name, phone, address: req.body.address?.trim() || '' });
    res.status(201).json({ customer });
  } catch (error) { next(error); }
};

exports.getCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });
    const orders = await Order.find({ customer: customer._id }).populate('degType', 'name').sort({ orderDate: -1 });
    const orderIds = orders.map((order) => order._id);
    const payments = await Payment.find({ order: { $in: orderIds } }).sort({ paymentDate: -1 });
    res.json({ customer, orders, payments });
  } catch (error) { next(error); }
};

const Deg = require('../models/Deg');

exports.listDegs = async (req, res, next) => {
  try {
    const filter = req.query.includeInactive === 'true' ? {} : { isActive: true };
    const degs = await Deg.find(filter).sort({ name: 1 });
    res.json({ degs });
  } catch (error) { next(error); }
};

exports.createDeg = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const price = Number(req.body.currentPrice);
    if (!name || !Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'A deg name and a valid price are required.' });
    const deg = await Deg.create({ name, currentPrice: price, priceHistory: [{ price, changedAt: new Date() }] });
    res.status(201).json({ deg });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A deg with this name already exists.' });
    next(error);
  }
};

exports.updateDeg = async (req, res, next) => {
  try {
    const deg = await Deg.findById(req.params.id);
    if (!deg) return res.status(404).json({ message: 'Deg not found.' });

    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Deg name is required.' });
    const price = Number(req.body.currentPrice);
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: 'A valid price is required.' });

    deg.name = name;
    if (deg.currentPrice !== price) {
      deg.currentPrice = price;
      deg.priceHistory.push({ price, changedAt: new Date() });
    }
    deg.isActive = typeof req.body.isActive === 'boolean' ? req.body.isActive : deg.isActive;
    await deg.save();
    res.json({ deg });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A deg with this name already exists.' });
    next(error);
  }
};

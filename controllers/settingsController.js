const Settings = require('../models/Settings');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOne() || await Settings.create({});
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ settings });
  } catch (error) {
    next(error);
  }
};

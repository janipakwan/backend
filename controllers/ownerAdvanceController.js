const OwnerAdvance = require('../models/OwnerAdvance');

function remainingAmount(advance) { return Math.max(0, advance.amount - advance.clearedAmount); }

exports.listAdvances = async (req, res, next) => {
  try {
    const advances = await OwnerAdvance.find().sort({ date: -1, createdAt: -1 });
    const pendingTotal = advances.filter((advance) => advance.status === 'pending').reduce((total, advance) => total + remainingAmount(advance), 0);
    res.json({ advances: advances.map((advance) => ({ ...advance.toObject(), remainingAmount: remainingAmount(advance) })), pendingTotal });
  } catch (error) { next(error); }
};

exports.clearAdvance = async (req, res, next) => {
  try {
    const advance = await OwnerAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: 'Owner advance not found.' });
    if (advance.status === 'cleared') return res.status(400).json({ message: 'This owner advance is already cleared.' });
    const amount = Number(req.body.amount);
    const remaining = remainingAmount(advance);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining) return res.status(400).json({ message: `Enter a clearing amount between Rs. 0.01 and Rs. ${remaining}.` });
    advance.clearedAmount += amount;
    if (remainingAmount(advance) === 0) { advance.status = 'cleared'; advance.clearedDate = new Date(); }
    await advance.save();
    res.json({ advance: { ...advance.toObject(), remainingAmount: remainingAmount(advance) } });
  } catch (error) { next(error); }
};

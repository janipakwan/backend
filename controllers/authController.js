const jwt = require('jsonwebtoken');
const User = require('../models/User');

function createToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function publicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

exports.login = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res) => res.json({ user: publicUser(req.user) });

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Purana aur naya password dono likhein.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Naya password kam az kam 6 characters ka hona chahiye.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Purana password ghalat hai (Incorrect password).' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password kamyabi se badal diya gaya hai.' });
  } catch (error) {
    next(error);
  }
};

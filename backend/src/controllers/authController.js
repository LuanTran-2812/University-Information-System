const authService = require('../services/authService');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await authService.getUserByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    const isValid = await authService.verifyPassword(password, user.MatKhau);
    if (!isValid) return res.status(401).json({ message: 'Invalid password' });

  // Include role in the JWT and return role to the client so frontend can redirect
  const payload = { sub: user.Email, email: user.Email, role: user.VaiTro };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, role: user.VaiTro });
  } catch (err) {
    next(err);
  }
};

module.exports = { login };

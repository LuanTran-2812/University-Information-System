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
    
    res.cookie('jwt_token', token, {
        httpOnly: true, // Quan trọng: JS frontend không đọc được cookie này, chống XSS
        secure: false,  // Đặt true nếu chạy https
        maxAge: 8 * 60 * 60 * 1000 // 8 tiếng
    });

    // Determine redirect URL based on role
    let redirectUrl = '/';
    const role = user.VaiTro || '';
    const normalizedRole = role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
    
    if (normalizedRole === 'admin') {
      redirectUrl = '/admin/dashboard';
    } else if (normalizedRole === 'giangvien' || normalizedRole.includes('giang')) {
      redirectUrl = '/dashboard-lecturer.html';
    } else if (normalizedRole === 'sinhvien' || normalizedRole.includes('sinh')) {
      redirectUrl = '/dashboard-student.html';
    }
    
    res.json({ 
      message: "Login successful",
      role: user.VaiTro,
      redirectUrl 
    });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
    res.clearCookie('jwt_token'); 
    res.json({ message: 'Đăng xuất thành công' });
};

module.exports = { login, logout };
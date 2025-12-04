const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const verifyToken = (req, res, next) => {
    const token = req.cookies.jwt_token;

    if (!token) {
        return res.redirect('/login.html'); 
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.clearCookie('jwt_token');
        return res.redirect('/login.html');
    }
};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        const userRole = req.user.role ? req.user.role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
        const isAllowed = allowedRoles.some(role => userRole.includes(role));
        
        if (!isAllowed) {
            return res.status(403).send('<h1>403 - Forbidden: Bạn không có quyền truy cập trang này</h1>');
        }
        next();
    }
};

module.exports = { verifyToken, checkRole };
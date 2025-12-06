const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const cookieParser = require('cookie-parser');
const { verifyToken, checkRole } = require('./middleware/authMiddleware');

const app = express();
app.use(cookieParser());

// Configure CORS for development (Live Server + local dev)
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:3000',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Set security headers and CSP
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000;"
  );
  next();
});

// --- CẤU HÌNH STATIC FILES ---
app.use('/css', express.static(path.join(__dirname, '../../frontend/publics/css')));
app.use('/js', express.static(path.join(__dirname, '../../frontend/publics/js')));
app.use('/images', express.static(path.join(__dirname, '../../frontend/publics/images')));

// Route cho trang Login (Công khai)
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/publics/login.html'));
});
// Redirect root về login nếu chưa đăng nhập
app.get('/', (req, res) => {
    res.redirect('/login.html');
});


// --- CẤU HÌNH PRIVATE ROUTES ---
const adminRoutes = [
    '/admin/dashboard',
    '/admin/nguoi-dung',
    '/admin/nguoi-dung/them-nguoi-dung',
    '/admin/nguoi-dung/chi-tiet',
    '/admin/mon-hoc',
    '/admin/lop-hoc',
    '/admin/lich-hoc',
    '/admin/hoc-ky'
];
// Trang Admin
app.get(adminRoutes, verifyToken, checkRole(['admin']), (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/publics/admin/index.html'));
});

// Trang Giảng viên
app.get('/lecturer/dashboard', verifyToken, checkRole(['giangvien', 'giang']), (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/publics/lecturer/index.html'));
});

// Trang Sinh viên
app.get('/student/dashboard', verifyToken, checkRole(['sinhvien', 'sinh']), (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/publics/student/index.html'));
});

// Serve static files from frontend/publics
app.use(express.static(path.join(__dirname, '../../frontend/publics')));

// API routes (mounted central router)
app.use('/api', routes);

// error handler (last)
app.use(errorHandler);

module.exports = app;

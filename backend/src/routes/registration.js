const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');

// Route lấy danh sách lớp (Method: GET)
// URL: /api/registration/classes?email=...&maHK=...
router.get('/classes', registrationController.getOpenClasses);

// Route Đăng ký/Hủy (Method: POST)
// URL: /api/registration/toggle
router.post('/toggle', registrationController.toggleRegistration);

module.exports = router;
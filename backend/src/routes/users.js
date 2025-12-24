const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// Tạm thời comment dòng này nếu bạn chưa muốn check quyền gắt gao ngay
// const { verifyToken, checkRole } = require('../middleware/authMiddleware');

// 1. API Lấy danh sách SV (Dành cho Admin hoặc Giảng viên xem)
// router.get('/students', verifyToken, checkRole(['admin', 'lecturer']), userController.getStudents);
router.get('/', userController.getStudents); // Để tạm thế này cho dễ test

// 2. API Tạo người dùng
router.post('/create', userController.createUser);

// 3. API Lấy danh sách khoa
router.get('/faculties', userController.getFaculties);

// 4. API Lấy chi tiết User (QUAN TRỌNG: ĐÃ BỎ CHECK ROLE ADMIN)
// Frontend Sinh viên gọi vào đây để lấy hồ sơ của chính mình
router.get('/detail', userController.getUserDetail); 

// 5. Các API Xóa / Sửa
router.delete('/delete/:email', userController.deleteUser);
router.post('/delete-multiple', userController.deleteMultipleUsers);
router.put('/update-profile', userController.updateProfile);

module.exports = router;
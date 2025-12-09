const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

router.get('/', classController.getClasses);
router.post('/create', classController.createClass);
router.put('/update/:id', classController.updateClass);
router.delete('/delete', classController.deleteClass); // Dùng query param ?maLop=...&maHK=...
router.post('/delete-multiple', classController.deleteMultipleClasses); // Xóa nhiều lớp
router.get('/lecturers', classController.getLecturers); // API lấy giảng viên
router.get('/students', classController.getStudents); // API lấy danh sách sinh viên
router.delete('/students/:mssv', classController.removeStudent); // API xóa sinh viên
router.get('/grade-structure', classController.getClassGradeStructure); // API lấy cấu trúc điểm của lớp

module.exports = router;
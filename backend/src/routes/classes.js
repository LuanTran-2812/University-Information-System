const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

router.get('/', classController.getClasses);
router.post('/create', classController.createClass);
router.put('/update/:id', classController.updateClass);
router.delete('/delete', classController.deleteClass); // Dùng query param ?maLop=...&maHK=...
router.post('/delete-multiple', classController.deleteMultipleClasses); // Xóa nhiều lớp
router.get('/lecturers', classController.getLecturers); // API lấy giảng viên

module.exports = router;
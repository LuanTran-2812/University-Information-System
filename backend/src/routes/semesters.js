const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');

// GET /api/semesters

router.get('/', semesterController.getSemesters);
router.post('/create', semesterController.createSemester); 
router.put('/update/:id', semesterController.updateSemester); // Sửa
router.delete('/delete/:id', semesterController.deleteSemester); // Xóa

module.exports = router;
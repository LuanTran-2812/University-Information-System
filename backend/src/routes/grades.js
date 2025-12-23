const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');

router.get('/class-grades', gradeController.getClassGrades);
router.put('/update', gradeController.updateGrades);

module.exports = router;
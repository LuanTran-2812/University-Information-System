const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');

// GET /api/subjects
router.get('/', subjectController.getSubjects);
router.post('/create', subjectController.createSubject);
router.put('/update/:id', subjectController.updateSubject);
router.delete('/delete/:id', subjectController.deleteSubject);
router.post('/delete-multiple', subjectController.deleteMultipleSubjects);

module.exports = router;
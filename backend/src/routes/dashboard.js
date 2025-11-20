const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Định nghĩa: GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

router.get('/lecturer-stats', dashboardController.getLecturerStats);

module.exports = router;

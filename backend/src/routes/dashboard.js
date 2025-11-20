const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Định nghĩa: GET /api/dashboard/stats
router.get('/stats', dashboardController.getStats);

// Định nghĩa MỚI: GET /api/dashboard/weekly-schedule
router.get('/weekly-schedule', dashboardController.getWeeklySchedule);

module.exports = router; 
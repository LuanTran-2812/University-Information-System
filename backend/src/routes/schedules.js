const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');

router.get('/', scheduleController.getSchedules);
router.post('/create', scheduleController.createSchedule);
router.delete('/delete', scheduleController.deleteSchedule);
router.put('/update', scheduleController.updateSchedule);
router.post('/delete-multiple', scheduleController.deleteMultipleSchedules);

module.exports = router;
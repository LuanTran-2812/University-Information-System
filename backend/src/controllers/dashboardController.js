const dashboardService = require('../services/dashboardService');

// 1. Khai báo hàm getStats
const getStats = async (req, res, next) => {
  try {
    const data = await dashboardService.getStats();
    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    next(err);
  }
};

// 2. Khai báo hàm getWeeklySchedule
const getWeeklySchedule = async (req, res, next) => {
  try {
    const data = await dashboardService.getWeeklySchedule();
    res.json({
      success: true,
      data: data
    });
  } catch (err) {
    next(err);
  }
};

const getLecturerStats = async (req, res, next) => {
    try {
        const { email } = req.query; // Lấy email từ ?email=...
        const data = await dashboardService.getLecturerStats(email);
        res.json({ success: true, data: data });
    } catch (err) { next(err); }
};

const getStudentStats = async (req, res, next) => {
    try {
        const { email } = req.query;
        const data = await dashboardService.getStudentStats(email);
        res.json({ success: true, data: data });
    } catch (err) { next(err); }
};

module.exports = { 
  getStats, 
  getLecturerStats,
  getWeeklySchedule,
  getStudentStats };


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

module.exports = { 
    getStats 
};
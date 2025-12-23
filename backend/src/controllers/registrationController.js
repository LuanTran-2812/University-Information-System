const registrationService = require('../services/registrationService');

// 1. Lấy danh sách lớp mở đăng ký
const getOpenClasses = async (req, res, next) => {
    try {
        const { email, maHK } = req.query; // Lấy tham số từ URL
        
        if (!email || !maHK) {
            return res.status(400).json({ success: false, message: "Thiếu email hoặc mã học kỳ" });
        }

        const data = await registrationService.getOpenClasses(email, maHK);
        res.json({ success: true, data: data });
    } catch (err) {
        next(err);
    }
};

// 2. Xử lý Đăng ký hoặc Hủy môn
const toggleRegistration = async (req, res, next) => {
    try {
        // Lấy dữ liệu từ Body (do method là POST)
        const { email, maLop, maMon, maHK, action } = req.body;

        if (!email || !maLop || !maMon || !maHK || !action) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin đăng ký" });
        }

        const result = await registrationService.toggleRegistration(email, maLop, maMon, maHK, action);
        
        if (result.success) {
            res.json({ success: true, message: result.message });
        } else {
            res.status(400).json({ success: false, message: result.message });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getOpenClasses,
    toggleRegistration
};
const gradeService = require('../services/gradeService');

const getClassGrades = async (req, res, next) => {
    try {
        const { maLop, maMon, maHK } = req.query;
        const data = await gradeService.getStudentGradesByClass(maLop, maMon, maHK);
        res.json({ success: true, data: data });
    } catch (err) { next(err); }
};

const updateGrades = async (req, res, next) => {
    try {
        console.log("Update Body:", req.body); // Thêm dòng này để debug

        // Gọi service xử lý
        await gradeService.updateStudentGrades(req.body);
        
        res.json({ success: true, message: 'Cập nhật điểm thành công!' });
    } catch (err) { 
        console.error("Lỗi Update Controller:", err); // Log lỗi chi tiết
        res.status(400).json({ success: false, message: err.message }); 
    }
};

module.exports = { getClassGrades, updateGrades };
const semesterService = require('../services/semesterService');

// Hàm lấy danh sách
const getSemesters = async (req, res, next) => {
  try {
    const semesters = await semesterService.getAllSemesters();
    res.json({
      success: true,
      data: semesters
    });
  } catch (err) {
    next(err);
  }
};

// Hàm thêm mới
const createSemester = async (req, res, next) => {
  try {
    await semesterService.createSemester(req.body);
    res.json({ success: true, message: 'Thêm học kỳ thành công!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateSemester = async (req, res, next) => {
  try {
      const { id } = req.params; // Lấy ID từ URL
      await semesterService.updateSemester(id, req.body);
      res.json({ success: true, message: 'Cập nhật thành công!' });
  } catch (err) {
      res.status(400).json({ success: false, message: err.message });
  }
};

const deleteSemester = async (req, res, next) => {
  try {
      const { id } = req.params;
      await semesterService.deleteSemester(id);
      res.json({ success: true, message: 'Xóa thành công!' });
  } catch (err) {
      res.status(400).json({ success: false, message: 'Không thể xóa (Dữ liệu đang được sử dụng)!' });
  }
};

module.exports = { getSemesters, createSemester, updateSemester, deleteSemester };
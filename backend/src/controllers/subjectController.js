const subjectService = require('../services/subjectService');

const getSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.json({
      success: true,
      data: subjects
    });
  } catch (err) {
    next(err);
  }
};


const createSubject = async (req, res, next) => {
    try {
      await subjectService.createSubject(req.body);
      res.json({ success: true, message: 'Thêm môn học thành công!' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
  

const updateSubject = async (req, res, next) => {
    try {
      const { id } = req.params;
      await subjectService.updateSubject(id, req.body);
      res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
  
  const deleteSubject = async (req, res, next) => {
    try {
      const { id } = req.params;
      await subjectService.deleteSubject(id);
      res.json({ success: true, message: 'Xóa thành công!' });
    } catch (err) {
      res.status(400).json({ success: false, message: 'Không thể xóa (Dữ liệu đang được sử dụng)!' });
    }
  };
  
  module.exports = { getSubjects, createSubject, updateSubject, deleteSubject };
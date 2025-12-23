const classService = require('../services/classService');

const getClasses = async (req, res, next) => {
  try {
    const { maHK } = req.query; // Lấy maHK từ URL ?maHK=...
    const classes = await classService.getClassesBySemester(maHK);
    res.json({ success: true, data: classes });
  } catch (err) { next(err); }
};

const createClass = async (req, res, next) => {
  try {
    await classService.createClass(req.body);
    res.json({ success: true, message: 'Thêm lớp thành công!' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const updateClass = async (req, res, next) => {
    try {
        const { id } = req.params; // id = maLop
        await classService.updateClass(id, req.body);
        res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const deleteClass = async (req, res, next) => {
    try {
        const { maLop, maHK, maMon } = req.query; // Lấy 3 khóa chính từ query param
        await classService.deleteClass(maLop, maHK, maMon);
        res.json({ success: true, message: 'Xóa thành công!' });
    } catch (err) { res.status(400).json({ success: false, message: 'Không thể xóa!' }); }
};

const getLecturers = async (req, res, next) => {
    try {
        const lecturers = await classService.getAllLecturers();
        res.json({ success: true, data: lecturers });
    } catch (err) { next(err); }
};

const getLecturerCourses = async (req, res, next) => {
    try {
        const { email, maHK } = req.query;
        const data = await classService.getLecturerCourses(email, maHK);
        res.json({ success: true, data: data });
    } catch (err) { next(err); }
};

const getClassesForGradeManagement = async (req, res, next) => {
    try {
        const { email, maHK } = req.query;
        const data = await classService.getClassesForGradeManagement(email, maHK);
        res.json({ success: true, data: data });
    } catch (err) { next(err); }
};

module.exports = { 
  getClasses, 
  createClass, 
  updateClass, 
  deleteClass, 
  getLecturers,
  getLecturerCourses,
  getClassesForGradeManagement
 };
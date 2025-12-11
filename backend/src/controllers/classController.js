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
    const result = await classService.createClass(req.body);
    res.json({ 
        success: true, 
        message: `${result.message} (Mã lớp: ${result.maLop})`,
        data: result 
    });
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
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getLecturers = async (req, res, next) => {
    try {
        const lecturers = await classService.getAllLecturers();
        res.json({ success: true, data: lecturers });
    } catch (err) { next(err); }
};

const deleteMultipleClasses = async (req, res, next) => {
    try {
        const { classes } = req.body; // Array of { maLop, maHK, maMon }
        
        if (!classes || !Array.isArray(classes) || classes.length === 0) {
            return res.status(400).json({ success: false, message: 'Danh sách lớp không hợp lệ' });
        }

        const deletedCount = await classService.deleteMultipleClasses(classes);
        res.json({ 
            success: true, 
            message: `Đã xóa thành công ${deletedCount} lớp học`,
            deletedCount 
        });
    } catch (err) { 
        res.status(400).json({ success: false, message: err.message }); 
    }
};

const getStudents = async (req, res, next) => {
    try {
        const { maLop, maHK, maMon } = req.query;
        const students = await classService.getStudentsByClass(maLop, maHK, maMon);
        res.json({ success: true, data: students });
    } catch (err) { next(err); }
};

const removeStudent = async (req, res, next) => {
    try {
        const { mssv } = req.params;
        const { maLop, maHK, maMon } = req.query;
        await classService.removeStudentFromClass(maLop, maHK, maMon, mssv);
        res.json({ success: true, message: 'Đã xóa sinh viên khỏi lớp!' });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getClassGradeStructure = async (req, res, next) => {
    try {
        const { maLop, maHK, maMon } = req.query;
        const result = await classService.getClassGradeStructure(maLop, maHK, maMon);
        res.json({ success: true, data: result });
    } catch (err) { next(err); }
};

module.exports = { getClasses, createClass, updateClass, deleteClass, getLecturers, deleteMultipleClasses, getStudents, removeStudent, getClassGradeStructure };
const scheduleService = require('../services/scheduleService');

const getSchedules = async (req, res, next) => {
  try {
    const { maHK } = req.query;
    const list = await scheduleService.getSchedulesBySemester(maHK);
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
};

const createSchedule = async (req, res, next) => {
  try {
    await scheduleService.createSchedule(req.body);
    res.json({ success: true, message: 'Thêm lịch thành công!' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const deleteSchedule = async (req, res, next) => {
    try {
        // Lấy các tham số từ query string
        const { maLop, maHK, maMon, thu, tietBD, tietKT, phong } = req.query;
        await scheduleService.deleteSchedule(maLop, maHK, maMon, thu, tietBD, tietKT, phong);
        res.json({ success: true, message: 'Xóa thành công!' });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};



const updateSchedule = async (req, res, next) => {
    try {
        await scheduleService.updateSchedule(req.body);
        res.json({ success: true, message: 'Cập nhật lịch thành công!' });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getLecturerSchedule = async (req, res, next) => {
    try {
        const { email } = req.query;
        const schedule = await scheduleService.getLecturerSchedule(email);
        res.json({ success: true, data: schedule });
    } catch (err) { next(err); }
};

const getStudentSchedule = async (req, res, next) => {
    try {
        const { email } = req.query;
        const schedule = await scheduleService.getStudentSchedule(email);
        res.json({ success: true, data: schedule });
    } catch (err) { next(err); }
};

module.exports = { getSchedules, createSchedule, deleteSchedule, updateSchedule,
                  getLecturerSchedule, getStudentSchedule
 };
const userService = require('../services/userService');

//  Hàm lấy danh sách sinh viên
const getStudents = async (req, res, next) => {
  try {
    // loc tùy chọn , giảng viên , vai trò 
    const { q, faculty, role } = req.query;
    const filters = { q, faculty, role };
    const students = await userService.getAllStudents(filters);
    res.json({
      success: true,
      data: students
    });
  } catch (err) {
    next(err);
  }
};

// Hàm lấy danh sách Khoa 
const getFaculties = async (req, res, next) => {
  try {
    const faculties = await userService.getAllFaculties();
    res.json({ 
      success: true, 
      data: faculties 
    });
  } catch (err) {
    next(err);
  }
};

//  Hàm tạo người dùng mới
const createUser = async (req, res, next) => {
  try {
    const result = await userService.createUser(req.body);
    res.json({ 
      success: true, 
      message: result.message || 'Thêm thành công!',
      NewCode: result.newCode, // Service trả về newCode, Controller trả về NewCode cho Frontend
      NewEmail: result.newEmail
    });
  } catch (err) {
    // Trả về lỗi 400 để frontend biết
    res.status(400).json({ 
      success: false, 
      message: err.message 
    });
  }
};

const getUserDetail = async (req, res, next) => {
  try {
    const { email } = req.query; // Lấy email từ URL (ví dụ: /api/users/detail?email=abc@...)
    const user = await userService.getUserDetail(email);
    
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }
  } catch (err) {
    next(err);
  }
};



const deleteUser = async (req, res, next) => {
  try {
    const { email } = req.params; // Lấy email từ URL
    await userService.deleteUser(email);
    res.json({ success: true, message: 'Xóa người dùng thành công!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteMultipleUsers = async (req, res, next) => {
  try {
    const { emails } = req.body; // Array of email addresses
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách email không hợp lệ' });
    }

    const deletedCount = await userService.deleteMultipleUsers(emails);
    res.json({ 
      success: true, 
      message: `Đã xóa thành công ${deletedCount} người dùng`,
      deletedCount 
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { getStudents, createUser, getFaculties, getUserDetail, deleteUser, deleteMultipleUsers };
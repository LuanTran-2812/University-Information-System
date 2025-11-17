
const { getPool } = require('../config/db');

const getStats = async () => {
  try {
    // 1. Lấy kết nối
    const pool = await getPool();

    // 2. Đếm Tổng số người dùng (Admin + GV + SV) trong bảng TaiKhoan
    const usersResult = await pool.request()
      .query('SELECT COUNT(*) as count FROM TaiKhoan');
    const totalUsers = usersResult.recordset[0].count;

    // 3. Đếm Tổng số Môn học
    const subjectsResult = await pool.request()
      .query('SELECT COUNT(*) as count FROM MonHoc');
    const totalSubjects = subjectsResult.recordset[0].count;

    // 4. Đếm Tổng số Lớp học
    const classesResult = await pool.request()
      .query('SELECT COUNT(*) as count FROM LopHoc');
    const totalClasses = classesResult.recordset[0].count;

    // 5. Trả về kết quả
    return {
      users: totalUsers,
      subjects: totalSubjects,
      classes: totalClasses
    };

  } catch (err) {
    console.error('Lỗi ở dashboardService:', err);
    throw err; // Ném lỗi ra để Controller bắt
  }
};

module.exports = { getStats };
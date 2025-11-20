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

    // 4. Đếm Tổng số Lớp học của học kỳ đang diễn ra
    const classesResult = await pool.request()
      .query(`
        SELECT COUNT(*) AS count
        FROM LopHoc LH
        JOIN v_ThongTinHocKy HK
            ON LH.MaHocKy = HK.MaHocKy
        WHERE HK.TrangThai = N'Đang diễn ra';
      `);

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

const getWeeklySchedule = async () => {
  try {
    const pool = await getPool();
    const scheduleResult = await pool.request()
      .query(`
        SELECT LH.Thu, COUNT(*) AS count
        FROM LichHoc LH
        JOIN v_ThongTinHocKy HK
            ON LH.MaHocKy = HK.MaHocKy
        JOIN v_ThongTinLopHoc VL
            ON LH.MaHocKy = VL.MaHocKy
            AND LH.MaLopHoc = VL.MaLopHoc
            AND LH.MaMon = VL.MaMonHoc
        WHERE HK.TrangThai = N'Đang diễn ra'
          AND VL.TrangThai = N'Đang học'
        GROUP BY LH.Thu
        ORDER BY 
          CASE LH.Thu
            WHEN 2 THEN 1
            WHEN 3 THEN 2
            WHEN 4 THEN 3
            WHEN 5 THEN 4
            WHEN 6 THEN 5
            WHEN 7 THEN 6
            WHEN 8 THEN 7
            ELSE LH.Thu
          END;
      `);

    const dayMap = {
        '2': 'THỨ HAI',
        '3': 'THỨ BA',
        '4': 'THỨ TƯ',
        '5': 'THỨ NĂM',
        '6': 'THỨ SÁU',
        '7': 'THỨ BẢY',
        '8': 'THỨ TÁM'
    };
    
    const weekKeys = ['2', '3', '4', '5', '6', '7', '8']; 
    
    const dataFromDB = new Map(scheduleResult.recordset.map(item => [item.Thu.toString(), item.count]));
    
    const weeklySchedule = weekKeys.map(key => ({
        day: dayMap[key],
        count: dataFromDB.get(key) || 0
    }));

    return weeklySchedule;

  } catch (err) {
    console.error('Lỗi ở getWeeklySchedule:', err);
    throw err;
  }
};

module.exports = { getStats, getWeeklySchedule };
const { getPool, sql } = require('../config/db'); 

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

// 2. Thống kê riêng cho Giảng viên ( Biểu đồ)
const getLecturerStats = async (email) => {
    try {
        const pool = await getPool();
        const DataType = sql || require('mssql'); // Fallback nếu biến sql chưa load kịp

        // A. Lấy Mã Giảng Viên (MSCB)
        const gvResult = await pool.request()
            .input('email', DataType.NVarChar, email) 
            .query("SELECT MSCB FROM GiangVien WHERE Email = @email");
        
        const mscb = gvResult.recordset[0]?.MSCB;
        if (!mscb) return { students: 0, courses: 0, classes: 0, weeklySchedule: [0,0,0,0,0,0,0] };

        // B. Các thống kê
        const classCount = await pool.request().input('mscb', DataType.VarChar, mscb).query("SELECT COUNT(*) as count FROM LopHoc WHERE MSCB = @mscb");
        const subjectCount = await pool.request().input('mscb', DataType.VarChar, mscb).query("SELECT COUNT(DISTINCT MaMonHoc) as count FROM LopHoc WHERE MSCB = @mscb");
        

        // Đếm tổng số sinh viên (DISTINCT MSSV)
        // Chỉ đếm những sinh viên có trạng thái là 'Đã đăng ký' để loại bỏ những người đã hủy hoặc rác
        const studentCount = await pool.request()
            .input('mscb', DataType.VarChar, mscb)
            .query(`
                SELECT COUNT(DISTINCT dk.MSSV) as count 
                FROM DangKy dk
                JOIN LopHoc lh ON dk.MaLopHoc = lh.MaLopHoc AND dk.MaHocKy = lh.MaHocKy AND dk.MaMon = lh.MaMonHoc
                WHERE lh.MSCB = @mscb
                AND dk.TrangThai = N'Đã đăng ký' -- Thêm điều kiện này cho chắc chắn
            `);

      

        // C.Thống kê số buổi dạy theo Thứ
        // Logic: Group by Thứ và đếm số lượng
        const scheduleResult = await pool.request()
            .input('mscb', DataType.VarChar, mscb)
            .query(`
                SELECT lh.Thu, COUNT(*) as SoBuoi
                FROM LichHoc lh
                JOIN LopHoc l ON lh.MaLopHoc = l.MaLopHoc AND lh.MaHocKy = l.MaHocKy AND lh.MaMon = l.MaMonHoc
                WHERE l.MSCB = @mscb
                GROUP BY lh.Thu
            `);

        // Chuẩn bị mảng dữ liệu cho 7 ngày (Thứ 2 -> CN)
        // Index 0 = Thứ 2, Index 1 = Thứ 3, ..., Index 6 = CN
        const weeklySchedule = [0, 0, 0, 0, 0, 0, 0];

        scheduleResult.recordset.forEach(row => {
            // row.Thu trả về: 2, 3, 4, 5, 6, 7, 8 (CN)
            // Ta cần map vào mảng: 2->0, 3->1, ..., 8->6
            if (row.Thu >= 2 && row.Thu <= 8) {
                weeklySchedule[row.Thu - 2] = row.SoBuoi;
            }
        });

        return {
            classes: classCount.recordset[0].count,
            courses: subjectCount.recordset[0].count,
            students: studentCount.recordset[0].count,
            weeklySchedule: weeklySchedule // Trả về mảng [2, 0, 1, 3...]
        };

    } catch (err) { throw err; }
};

module.exports = { getStats, getWeeklySchedule, getLecturerStats };

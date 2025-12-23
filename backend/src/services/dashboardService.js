
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


// backend/src/services/dashboardService.js

const getStudentStats = async (email) => {
    try {
        const pool = await getPool();

        // 1. Lấy MSSV từ Email
        const svRes = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT MSSV FROM SinhVien WHERE Email = @email");
        
        const mssv = svRes.recordset[0]?.MSSV;
        if (!mssv) return null; // Hoặc ném lỗi nếu không tìm thấy SV

        // 2. Xác định Học kỳ (Logic thông minh hơn)
        const today = new Date().toISOString().split('T')[0];
        
        // Cách 1: Tìm học kỳ đang diễn ra đúng ngày hôm nay
        let hkRes = await pool.request()
            .input('today', sql.Date, today)
            .query("SELECT MaHocKy FROM HocKy WHERE @today BETWEEN NgayBatDau AND NgayKetThuc");
        
        let maHK = hkRes.recordset[0]?.MaHocKy;

        // Cách 2 (Dự phòng): Nếu hôm nay đang nghỉ hè/tết (không thuộc HK nào), 
        // thì lấy Học kỳ MỚI NHẤT trong hệ thống để hiển thị cho đẹp.
        if (!maHK) {
             const latestHkRes = await pool.request()
                .query("SELECT TOP 1 MaHocKy FROM HocKy ORDER BY NgayBatDau DESC");
             maHK = latestHkRes.recordset[0]?.MaHocKy;
        }

        // 3. Tính toán số liệu
        
        let weeklySchedule = [0, 0, 0, 0, 0, 0, 0];

        if (maHK) {
            // A. Số tiết trong tuần (Cộng tổng số tiết của các môn đang học)
            const periodRes = await pool.request()
                .input('mssv', sql.VarChar, mssv)
                .input('maHK', sql.VarChar, maHK)
                .query(`
                    SELECT SUM(LH.TietKetThuc - LH.TietBatDau + 1) as TongTiet
                    FROM LichHoc LH
                    JOIN DangKy DK ON LH.MaLopHoc = DK.MaLopHoc AND LH.MaMon = DK.MaMon AND LH.MaHocKy = DK.MaHocKy
                    WHERE DK.MSSV = @mssv AND DK.MaHocKy = @maHK AND DK.TrangThai = N'Đã đăng ký'
                `);
            weeklyPeriods = periodRes.recordset[0].TongTiet || 0;

            // B. Số Khóa học (Số môn học trong HK này)
            const courseRes = await pool.request()
                .input('mssv', sql.VarChar, mssv)
                .input('maHK', sql.VarChar, maHK)
                .query("SELECT COUNT(DISTINCT MaMon) as SoLuong FROM DangKy WHERE MSSV = @mssv AND MaHocKy = @maHK AND TrangThai = N'Đã đăng ký'");
            coursesCount = courseRes.recordset[0].SoLuong;

            // D. Biểu đồ lịch học tuần
            const scheduleRes = await pool.request()
                .input('mssv', sql.VarChar, mssv)
                .input('maHK', sql.VarChar, maHK)
                .query(`
                    SELECT LH.Thu, COUNT(*) as SoBuoi
                    FROM LichHoc LH
                    JOIN DangKy DK ON LH.MaLopHoc = DK.MaLopHoc AND LH.MaMon = DK.MaMon AND LH.MaHocKy = DK.MaHocKy
                    WHERE DK.MSSV = @mssv AND DK.MaHocKy = @maHK AND DK.TrangThai = N'Đã đăng ký'
                    GROUP BY LH.Thu
                `);
            
            scheduleRes.recordset.forEach(row => {
                const index = row.Thu - 2; // Map thứ 2->0, 3->1...
                if (index >= 0 && index <= 6) weeklySchedule[index] = row.SoBuoi;
            });
        }

        // C. Tổng lớp học (Lịch sử học tập - Đếm tất cả các lớp từng tham gia)
        const totalClassesRes = await pool.request()
            .input('mssv', sql.VarChar, mssv)
            .query("SELECT COUNT(*) as SoLuong FROM DangKy WHERE MSSV = @mssv AND TrangThai = N'Đã đăng ký'");
        totalClasses = totalClassesRes.recordset[0].SoLuong;

        return {
      weeklyPeriods: weeklyPeriods, // Correct
      courses: coursesCount,        // Correct
      totalClasses: totalClasses,   // Correct
      weeklySchedule: weeklySchedule
  };

    } catch (err) { throw err; }
};

module.exports = { 
  getStats, 
  getLecturerStats,
  getStudentStats };
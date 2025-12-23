const { getPool, sql } = require('../config/db');

// Lấy danh sách lịch học theo Học kỳ
const getSchedulesBySemester = async (maHK) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('maHK', sql.VarChar, maHK)
      .query(`
        SELECT 
            lh.MaLopHoc, lh.MaHocKy, lh.MaMon, 
            lh.PhongHoc, lh.Thu, 
            lh.TietBatDau, lh.TietKetThuc, 
            lh.TuanBatDau, lh.TuanKetThuc,
            mh.TenMon,
            gv.HoTen AS TenGiangVien
        FROM LichHoc lh
        JOIN LopHoc l ON lh.MaLopHoc = l.MaLopHoc AND lh.MaHocKy = l.MaHocKy AND lh.MaMon = l.MaMonHoc
        JOIN MonHoc mh ON l.MaMonHoc = mh.MaMon
        LEFT JOIN GiangVien gv ON l.MSCB = gv.MSCB
        WHERE lh.MaHocKy = @maHK
        ORDER BY lh.Thu ASC, lh.Tiet ASC
      `);
    return result.recordset;
  } catch (err) { throw err; }
};

// Thêm lịch học
const createSchedule = async (data) => {
  try {
    const pool = await getPool();
    const { maLop, maHK, maMon, phong, thu, tietBD, tietKT, tuanBD, tuanKT } = data;

    // Kiểm tra trùng lịch (cơ bản)
    const check = await pool.request()
        .input('phong', sql.VarChar, phong)
        .input('thu', sql.Int, thu)
        .input('tietBD', sql.VarChar, tiet)
        .input('tietKT', sql.VarChar, tiet)
        .input('maHK', sql.VarChar, maHK)
        .query(`
            SELECT * FROM LichHoc 
            WHERE MaHocKy=@maHK AND PhongHoc=@phong AND Thu=@thu 
            AND (
                (TietBatDau <= @tietBD AND TietKetThuc >= @tietBD) -- Giờ mới bắt đầu trong giờ cũ
                OR 
                (TietBatDau <= @tietKT AND TietKetThuc >= @tietKT) -- Giờ mới kết thúc trong giờ cũ
            )
        `);
    
    if (check.recordset.length > 0) throw new Error('Phòng học này đã bị trùng lịch vào thời gian đó!');

    await pool.request()
        .input('tuanBD', sql.Int, tuanBD)
        .input('tuanKT', sql.Int, tuanKT)
        .input('tietBD', sql.Int, tietBD)
        .input('tietKT', sql.Int, tietKT)
        .input('thu', sql.Int, thu)
        .input('phong', sql.VarChar, phong)
        .input('maLop', sql.VarChar, maLop)
        .input('maHK', sql.VarChar, maHK)
        .input('maMon', sql.VarChar, maMon)
        .query(`
            INSERT INTO LichHoc (TuanBatDau, TuanKetThuc, TietBatDau, TietKetThuc, Thu, PhongHoc, MaLopHoc, MaHocKy, MaMon)
            VALUES (@tuanBD, @tuanKT, @tiet, @thu, @phong, @maLop, @maHK, @maMon)
        `);
    return { success: true };
  } catch (err) { throw err; }
};

// Xóa lịch học (Cần đủ khóa chính)
const deleteSchedule = async (maLop, maHK, maMon, thu, tiet, phong) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('thu', sql.Int, thu)
            .input('tietBD', sql.Int, tietBD)
            .input('tietKT', sql.Int, tietKT)
            .input('phong', sql.VarChar, phong)
            .query(`
                DELETE FROM LichHoc 
                WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon 
                AND Thu=@thu AND TietBatDau=@tietBD AND TietKetThuc=@tietKT AND PhongHoc=@phong
            `);
        return { success: true };
    } catch (err) { throw err; }
};


// HÀM SỬA LỊCH HỌC
const updateSchedule = async (data) => {
    try {
        const pool = await getPool();
        const { 
            maLop, maHK, maMon, 
            oldThu, oldTiet, oldPhong, 
            newThu, newTietBD, newTietKT, newPhong, newTuanBD, newTuanKT 
        } = data;

        // 1. Kiểm tra trùng lịch (Nếu có thay đổi giờ/phòng)
        if (oldThu != newThu || oldTietBD != newTietBD || oldTietKT != newTietKT || oldPhong != newPhong) {
             const check = await pool.request()
                .input('phong', sql.VarChar, newPhong)
                .input('thu', sql.Int, newThu)
                input('tietBD', sql.Int, newTietBD)
                .input('tietKT', sql.Int, newTietKT)
                .input('maHK', sql.VarChar, maHK)
                .query(`
                    SELECT * FROM LichHoc 
                    WHERE MaHocKy=@maHK AND PhongHoc=@phong AND Thu=@thu 
                    AND (
                        (TietBatDau <= @tietKT AND TietKetThuc >= @tietBD) -- Logic giao nhau của khoảng thời gian
                    )
                `);
             if (check.recordset.length > 0) {
                 throw new Error(`Lịch học bị trùng tại phòng ${newPhong} thứ ${newThu} tiết ${newTietBD}-${newTietKT}!`);
             }
        }

        // 2. Thực hiện Update
        await pool.request()
            .input('newThu', sql.Int, newThu)
            .input('newTietBD', sql.Int, newTietBD)
            .input('newTietKT', sql.Int, newTietKT)
            .input('newPhong', sql.VarChar, newPhong)
            .input('newTuanBD', sql.Int, newTuanBD)
            .input('newTuanKT', sql.Int, newTuanKT)
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('oldThu', sql.Int, oldThu)
            .input('oldTiet', sql.VarChar, oldTiet)
            .input('oldPhong', sql.VarChar, oldPhong)
            .query(`
                UPDATE LichHoc
                SET Thu=@newThu, 
                    TietBatDau=@newTietBD, 
                    TietKetThuc=@newTietKT, 
                    PhongHoc=@newPhong, 
                    TuanBatDau=@newTuanBD, 
                    TuanKetThuc=@newTuanKT
                WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon 
                  AND Thu=@oldThu 
                  AND TietBatDau=@oldTietBD 
                  AND TietKetThuc=@oldTietKT 
                  AND PhongHoc=@oldPhong
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Lấy lịch dạy của giảng viên (theo email)
const getLecturerSchedule = async (email) => {
    try {
        const pool = await getPool();
        const DataType = sql || require('mssql');

        // 1. Lấy MSCB
        const gvResult = await pool.request()
            .input('email', DataType.NVarChar, email)
            .query("SELECT MSCB FROM GiangVien WHERE Email = @email");
        
        const mscb = gvResult.recordset[0]?.MSCB;
        if (!mscb) return [];

        // 2. Lấy lịch dạy (Join nhiều bảng để lấy tên môn, phòng, thứ, tiết)
        const result = await pool.request()
            .input('mscb', DataType.VarChar, mscb)
            .query(`
                SELECT 
                    lh.Thu, lh.PhongHoc, 
                    lh.TietBatDau, lh.TietKetThuc, -- Lấy 2 cột mới
                    mh.TenMon, lh.MaLopHoc,
                    lh.TuanBatDau, lh.TuanKetThuc,
                    hk.NgayBatDau
                FROM LichHoc lh
                JOIN LopHoc l ON lh.MaLopHoc = l.MaLopHoc AND lh.MaHocKy = l.MaHocKy AND lh.MaMon = l.MaMonHoc
                JOIN MonHoc mh ON l.MaMonHoc = mh.MaMon
                JOIN HocKy hk ON l.MaHocKy = hk.MaHocKy
                WHERE l.MSCB = @mscb
                ORDER BY lh.Thu, lh.TietBatDau
            `);

        return result.recordset;
    } catch (err) { throw err; }
};

const getStudentSchedule = async (email) => {
    try {
        const pool = await getPool();

        // 1. Lấy MSSV
        const svRes = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT MSSV FROM SinhVien WHERE Email = @email");
        
        const mssv = svRes.recordset[0]?.MSSV;
        if (!mssv) return [];

        // 2. Lấy lịch học dựa trên các môn đã đăng ký
        // Logic: Tìm tất cả lịch học của các Mã Lớp mà sinh viên này có trong bảng DangKy
        const res = await pool.request()
            .input('mssv', sql.VarChar, mssv)
            .query(`
                SELECT 
                    LH.MaLopHoc,
                    LH.MaMon,
                    MH.TenMon,
                    LH.Thu,           -- Thứ (2, 3, ... 8)
                    LH.TietBatDau,
                    LH.TietKetThuc,
                    LH.PhongHoc,
                    LH.TuanBatDau,
                    LH.TuanKetThuc,
                    HK.NgayBatDau     -- Để tính ngày cụ thể
                FROM LichHoc LH
                JOIN DangKy DK ON LH.MaLopHoc = DK.MaLopHoc 
                               AND LH.MaMon = DK.MaMon 
                               AND LH.MaHocKy = DK.MaHocKy
                JOIN MonHoc MH ON LH.MaMon = MH.MaMon
                JOIN HocKy HK ON LH.MaHocKy = HK.MaHocKy
                WHERE DK.MSSV = @mssv 
                  AND DK.TrangThai = N'Đã đăng ký'
            `);
        
        return res.recordset;

    } catch (err) { throw err; }
};

module.exports = { getSchedulesBySemester, createSchedule, deleteSchedule, updateSchedule, 
                    getLecturerSchedule, getStudentSchedule
};
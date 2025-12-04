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
            lh.PhongHoc, lh.Thu, lh.Tiet, 
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
    const { maLop, maHK, maMon, phong, thu, tiet, tuanBD, tuanKT } = data;

    // Kiểm tra trùng lịch (cơ bản)
    const check = await pool.request()
        .input('phong', sql.VarChar, phong)
        .input('thu', sql.Int, thu)
        .input('tiet', sql.VarChar, tiet)
        .input('maHK', sql.VarChar, maHK)
        .query('SELECT * FROM LichHoc WHERE MaHocKy=@maHK AND PhongHoc=@phong AND Thu=@thu AND Tiet=@tiet');
    
    if (check.recordset.length > 0) throw new Error('Phòng học này đã bị trùng lịch vào thời gian đó!');

    await pool.request()
        .input('tuanBD', sql.Int, tuanBD)
        .input('tuanKT', sql.Int, tuanKT)
        .input('tiet', sql.VarChar, tiet)
        .input('thu', sql.Int, thu)
        .input('phong', sql.VarChar, phong)
        .input('maLop', sql.VarChar, maLop)
        .input('maHK', sql.VarChar, maHK)
        .input('maMon', sql.VarChar, maMon)
        .query(`
            INSERT INTO LichHoc (TuanBatDau, TuanKetThuc, Tiet, Thu, PhongHoc, MaLopHoc, MaHocKy, MaMon)
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
            .input('tiet', sql.VarChar, tiet)
            .input('phong', sql.VarChar, phong)
            .query(`
                DELETE FROM LichHoc 
                WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon AND Thu=@thu AND Tiet=@tiet AND PhongHoc=@phong
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
            newThu, newTiet, newPhong, newTuanBD, newTuanKT 
        } = data;

        // 1. Kiểm tra trùng lịch (Nếu có thay đổi giờ/phòng)
        if (oldThu != newThu || oldTiet != newTiet || oldPhong != newPhong) {
             const check = await pool.request()
                .input('phong', sql.VarChar, newPhong)
                .input('thu', sql.Int, newThu)
                .input('tiet', sql.VarChar, newTiet)
                .input('maHK', sql.VarChar, maHK)
                .query('SELECT * FROM LichHoc WHERE MaHocKy=@maHK AND PhongHoc=@phong AND Thu=@thu AND Tiet=@tiet');
             
             if (check.recordset.length > 0) throw new Error(`Lịch học bị trùng tại phòng ${newPhong} thứ ${newThu} tiết ${newTiet}!`);
        }

        // 2. Thực hiện Update
        await pool.request()
            .input('newThu', sql.Int, newThu)
            .input('newTiet', sql.VarChar, newTiet)
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
                SET Thu=@newThu, Tiet=@newTiet, PhongHoc=@newPhong, TuanBatDau=@newTuanBD, TuanKetThuc=@newTuanKT
                WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon AND Thu=@oldThu AND Tiet=@oldTiet AND PhongHoc=@oldPhong
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Xóa nhiều lịch học
const deleteMultipleSchedules = async (schedules) => {
    try {
        const pool = await getPool();
        let deletedCount = 0;

        // Xóa từng lịch học trong danh sách
        for (const schedule of schedules) {
            const { MaLopHoc, MaHocKy, MaMon, Thu, Tiet, PhongHoc } = schedule;
            
            // Validate dữ liệu
            if (!MaLopHoc || !MaHocKy || !MaMon || !Thu || !Tiet || !PhongHoc) {
                console.warn('Bỏ qua lịch học không hợp lệ:', schedule);
                continue;
            }

            const result = await pool.request()
                .input('maLop', sql.VarChar, MaLopHoc)
                .input('maHK', sql.VarChar, MaHocKy)
                .input('maMon', sql.VarChar, MaMon)
                .input('thu', sql.Int, Thu)
                .input('tiet', sql.VarChar, Tiet)
                .input('phong', sql.VarChar, PhongHoc)
                .query(`
                    DELETE FROM LichHoc 
                    WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon 
                      AND Thu=@thu AND Tiet=@tiet AND PhongHoc=@phong
                `);
            
            deletedCount += result.rowsAffected[0];
        }

        return deletedCount;
    } catch (err) { 
        throw err; 
    }
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
                    lh.Thu, lh.Tiet, lh.PhongHoc, 
                    mh.TenMon, lh.MaLopHoc,
                    lh.TuanBatDau, lh.TuanKetThuc,
                    hk.NgayBatDau -- <--- LẤY THÊM CỘT NÀY
                FROM LichHoc lh
                JOIN LopHoc l ON lh.MaLopHoc = l.MaLopHoc AND lh.MaHocKy = l.MaHocKy AND lh.MaMon = l.MaMonHoc
                JOIN MonHoc mh ON l.MaMonHoc = mh.MaMon
                JOIN HocKy hk ON l.MaHocKy = hk.MaHocKy -- <--- JOIN THÊM BẢNG HỌC KỲ
                WHERE l.MSCB = @mscb
                ORDER BY lh.Thu, lh.Tiet
            `);

        return result.recordset;
    } catch (err) { throw err; }
};

module.exports = { 
    getSchedulesBySemester, 
    createSchedule, 
    deleteSchedule, 
    updateSchedule, 
    deleteMultipleSchedules, 
    getLecturerSchedule
};
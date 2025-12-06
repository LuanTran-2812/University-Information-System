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
            lh.TietBatDau, lh.TietKetThuc, -- Thay đổi cột
            lh.TuanBatDau, lh.TuanKetThuc,
            mh.TenMon,
            gv.HoTen AS TenGiangVien
        FROM LichHoc lh
        JOIN LopHoc l ON lh.MaLopHoc = l.MaLopHoc AND lh.MaHocKy = l.MaHocKy AND lh.MaMon = l.MaMonHoc
        JOIN MonHoc mh ON l.MaMonHoc = mh.MaMon
        LEFT JOIN GiangVien gv ON l.MSCB = gv.MSCB
        WHERE lh.MaHocKy = @maHK
        ORDER BY lh.Thu ASC, lh.TietBatDau ASC -- Order theo tiết bắt đầu
      `);
    return result.recordset;
  } catch (err) { throw err; }
};

// Thêm lịch học
const createSchedule = async (data) => {
  try {
    const pool = await getPool();
    const { maLop, maHK, maMon, phong, thu, tietBD, tietKT, tuanBD, tuanKT } = data;

    // 1. Kiểm tra trùng lịch
    const check = await pool.request()
        .input('phong', sql.VarChar, phong)
        .input('thu', sql.Int, thu)
        .input('tietBD', sql.Int, tietBD)
        .input('tietKT', sql.Int, tietKT)
        .input('maHK', sql.VarChar, maHK)
        .query(`
            SELECT * FROM LichHoc 
            WHERE MaHocKy=@maHK 
            AND PhongHoc=@phong 
            AND Thu=@thu 
            AND ((@tietBD <= TietKetThuc) AND (@tietKT >= TietBatDau))
        `);
    
    if (check.recordset.length > 0) throw new Error(`Phòng học ${phong} đã bị trùng lịch vào khoảng tiết ${tietBD}-${tietKT}!`);

    // 2. Insert
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
            VALUES (@tuanBD, @tuanKT, @tietBD, @tietKT, @thu, @phong, @maLop, @maHK, @maMon)
        `);
    return { success: true };
  } catch (err) { throw err; }
};

// Xóa lịch học
const deleteSchedule = async (maLop, maHK, maMon, thu, tietBD, tietKT, phong) => {
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
            oldThu, oldTietBD, oldTietKT, oldPhong, 
            newThu, newTietBD, newTietKT, newPhong, newTuanBD, newTuanKT 
        } = data;

        // 1. Kiểm tra trùng lịch (Nếu có thay đổi giờ/phòng)
        if (oldThu != newThu || oldTietBD != newTietBD || oldTietKT != newTietKT || oldPhong != newPhong) {
             const check = await pool.request()
                .input('phong', sql.VarChar, newPhong)
                .input('thu', sql.Int, newThu)
                .input('tietBD', sql.Int, newTietBD)
                .input('tietKT', sql.Int, newTietKT)
                .input('maHK', sql.VarChar, maHK)
                // Phải loại trừ chính dòng đang sửa (để tránh báo trùng với chính nó)
                .input('maLop', sql.VarChar, maLop)
                .input('maMon', sql.VarChar, maMon)
                .input('oldThu', sql.Int, oldThu)
                .input('oldTietBD', sql.Int, oldTietBD)
                .input('oldTietKT', sql.Int, oldTietKT)
                .input('oldPhong', sql.VarChar, oldPhong)
                .query(`
                    SELECT * FROM LichHoc 
                    WHERE MaHocKy=@maHK AND PhongHoc=@phong AND Thu=@thu 
                    AND ((@tietBD <= TietKetThuc) AND (@tietKT >= TietBatDau))
                    AND NOT (MaLopHoc=@maLop AND MaMon=@maMon AND Thu=@oldThu AND TietBatDau=@oldTietBD AND TietKetThuc=@oldTietKT AND PhongHoc=@oldPhong)
                `);
             
             if (check.recordset.length > 0) throw new Error(`Lịch học bị trùng tại phòng ${newPhong} thứ ${newThu} tiết ${newTietBD}-${newTietKT}!`);
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
            .input('oldTietBD', sql.Int, oldTietBD)
            .input('oldTietKT', sql.Int, oldTietKT)
            .input('oldPhong', sql.VarChar, oldPhong)
            .query(`
                UPDATE LichHoc
                SET Thu=@newThu, TietBatDau=@newTietBD, TietKetThuc=@newTietKT, PhongHoc=@newPhong, TuanBatDau=@newTuanBD, TuanKetThuc=@newTuanKT
                WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon 
                AND Thu=@oldThu AND TietBatDau=@oldTietBD AND TietKetThuc=@oldTietKT AND PhongHoc=@oldPhong
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Xóa nhiều lịch học
const deleteMultipleSchedules = async (schedules) => {
    try {
        const pool = await getPool();
        let deletedCount = 0;

        for (const schedule of schedules) {
            const { MaLopHoc, MaHocKy, MaMon, Thu, TietBatDau, TietKetThuc, PhongHoc } = schedule;
            
            if (!MaLopHoc || !MaHocKy || !MaMon || !Thu || !TietBatDau || !TietKetThuc || !PhongHoc) {
                continue;
            }

            const result = await pool.request()
                .input('maLop', sql.VarChar, MaLopHoc)
                .input('maHK', sql.VarChar, MaHocKy)
                .input('maMon', sql.VarChar, MaMon)
                .input('thu', sql.Int, Thu)
                .input('tietBD', sql.Int, TietBatDau)
                .input('tietKT', sql.Int, TietKetThuc)
                .input('phong', sql.VarChar, PhongHoc)
                .query(`
                    DELETE FROM LichHoc 
                    WHERE MaLopHoc=@maLop AND MaHocKy=@maHK AND MaMon=@maMon 
                      AND Thu=@thu AND TietBatDau=@tietBD AND TietKetThuc=@tietKT AND PhongHoc=@phong
                `);
            
            deletedCount += result.rowsAffected[0];
        }

        return deletedCount;
    } catch (err) { 
        throw err; 
    }
};

// Lấy lịch dạy của giảng viên
const getLecturerSchedule = async (email) => {
    try {
        const pool = await getPool();
        const DataType = sql || require('mssql');

        const gvResult = await pool.request()
            .input('email', DataType.NVarChar, email)
            .query("SELECT MSCB FROM GiangVien WHERE Email = @email");
        
        const mscb = gvResult.recordset[0]?.MSCB;
        if (!mscb) return [];

        const result = await pool.request()
            .input('mscb', DataType.VarChar, mscb)
            .query(`
                SELECT 
                    lh.Thu, lh.TietBatDau, lh.TietKetThuc, lh.PhongHoc, 
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

module.exports = { 
    getSchedulesBySemester, 
    createSchedule, 
    deleteSchedule, 
    updateSchedule, 
    deleteMultipleSchedules, 
    getLecturerSchedule
};
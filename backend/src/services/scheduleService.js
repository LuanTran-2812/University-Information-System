const { getPool, sql } = require('../config/db');

// Lấy danh sách lịch học theo Học kỳ
const getSchedulesBySemester = async (maHK, filters = {}) => {
    try {
        const pool = await getPool();
        // Build dynamic WHERE clauses based on (lecturer, room, day, q)
        const request = pool.request();
        request.input('maHK', sql.VarChar, maHK);

        let whereClauses = ['lh.MaHocKy = @maHK'];

        if (filters.lecturer) {
            request.input('lecturer', sql.NVarChar, `%${filters.lecturer}%`);
            whereClauses.push("gv.HoTen LIKE @lecturer");
        }

        if (filters.room) {
            request.input('room', sql.VarChar, filters.room);
            whereClauses.push("lh.PhongHoc = @room");
        }

        if (filters.day) {
            request.input('day', sql.Int, parseInt(filters.day));
            whereClauses.push("lh.Thu = @day");
        }

        if (filters.q) {
            request.input('q', sql.NVarChar, `%${filters.q}%`);
            whereClauses.push("(lh.MaLopHoc LIKE @q OR mh.TenMon LIKE @q OR gv.HoTen LIKE @q OR lh.PhongHoc LIKE @q)");
        }

        const whereSql = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const sqlText = `
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
            ${whereSql}
            ORDER BY lh.Thu ASC, lh.TietBatDau ASC
        `;

        const result = await request.query(sqlText);
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

        // 1. Kiểm tra trạng thái lớp học từ View
        const checkStatus = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(`
                SELECT v.TrangThai, mh.TenMon 
                FROM v_ThongTinLopHoc v
                JOIN MonHoc mh ON v.MaMonHoc = mh.MaMon
                WHERE v.MaLopHoc = @maLop AND v.MaHocKy = @maHK AND v.MaMonHoc = @maMon
            `);

        if (checkStatus.recordset.length === 0) {
            throw new Error('Không tìm thấy thông tin lớp học!');
        }

        const { TrangThai, TenMon } = checkStatus.recordset[0];
        const allowDelete = (TrangThai === 'Đã xếp lịch' || TrangThai === 'Đã hủy lớp');

        if (!allowDelete) {
            let errorMsg = `Không thể xóa lịch của lớp ${maLop} - ${TenMon} (Trạng thái: ${TrangThai}). `;
            
            if (TrangThai === 'Đang đăng ký' || TrangThai === 'Kết thúc đăng ký') {
                errorMsg += 'Sinh viên đang đăng ký hoặc chờ xét duyệt, việc xóa lịch sẽ làm mất thông tin thời khóa biểu!';
            } else if (TrangThai === 'Đang học') {
                errorMsg += 'Lớp đang diễn ra, không được xóa lịch sử giảng dạy!';
            } else if (TrangThai === 'Đã kết thúc') {
                errorMsg += 'Lớp đã kết thúc, cần lưu trữ lịch sử!';
            }

            throw new Error(errorMsg);
        }

        // 3. Thực hiện XÓA
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
        const transaction = new sql.Transaction(pool);
        
        // Bắt đầu Transaction để đảm bảo an toàn dữ liệu
        await transaction.begin();

        try {
            let deletedCount = 0;

            for (const s of schedules) {
                const { MaLopHoc, MaHocKy, MaMon, Thu, TietBatDau, TietKetThuc, PhongHoc } = s;
                
                if (!MaLopHoc || !MaHocKy || !MaMon) continue;

                // 1. Kiểm tra trạng thái từng lớp trong danh sách
                const reqCheck = new sql.Request(transaction);
                const resCheck = await reqCheck
                    .input('maLop', sql.VarChar, MaLopHoc)
                    .input('maHK', sql.VarChar, MaHocKy)
                    .input('maMon', sql.VarChar, MaMon)
                    .query(`
                        SELECT v.TrangThai, mh.TenMon 
                        FROM v_ThongTinLopHoc v
                        JOIN MonHoc mh ON v.MaMonHoc = mh.MaMon
                        WHERE v.MaLopHoc = @maLop AND v.MaHocKy = @maHK AND v.MaMonHoc = @maMon
                    `);

                if (resCheck.recordset.length > 0) {
                    const { TrangThai, TenMon } = resCheck.recordset[0];
                    const allowDelete = (TrangThai === 'Đã xếp lịch' || TrangThai === 'Đã hủy lớp');

                    if (!allowDelete) {
                        throw new Error(`Không thể xóa lịch của lớp ${MaLopHoc} - ${TenMon}. Trạng thái hiện tại là "${TrangThai}" (Chỉ được xóa khi lớp ở trạng thái "Đã xếp lịch" hoặc "Đã hủy")!`);
                    }
                }

                // 2. Thực hiện xóa
                const reqDel = new sql.Request(transaction);
                const result = await reqDel
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

            await transaction.commit();
            return deletedCount;

        } catch (err) {
            await transaction.rollback();
            throw err;
        }
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
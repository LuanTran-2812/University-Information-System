const { getPool, sql } = require('../config/db');

// Lấy danh sách lớp theo Học kỳ
const getClassesBySemester = async (maHocKy) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('maHK', sql.VarChar, maHocKy)
      .query(`
        SELECT 
            lh.MaLopHoc, lh.MaHocKy, lh.MaMonHoc, lh.SiSoToiDa, lh.SiSoHienTai,
            mh.TenMon,
            gv.HoTen AS TenGiangVien, gv.MSCB,
            v.TrangThai -- Lấy trạng thái từ View v_ThongTinLopHoc
        FROM LopHoc lh
        LEFT JOIN MonHoc mh ON lh.MaMonHoc = mh.MaMon
        LEFT JOIN GiangVien gv ON lh.MSCB = gv.MSCB
        LEFT JOIN v_ThongTinLopHoc v ON lh.MaLopHoc = v.MaLopHoc AND lh.MaHocKy = v.MaHocKy AND lh.MaMonHoc = v.MaMonHoc
        WHERE lh.MaHocKy = @maHK
      `);
    return result.recordset;
  } catch (err) { throw err; }
};

// Thêm lớp học
const createClass = async (data) => {
  try {
    const pool = await getPool();
    const { maHK, maMon, siSoMax, mscb } = data;

    const result = await pool.request()
        .input('MaHK', sql.VarChar(10), maHK)
        .input('MaMon', sql.VarChar(10), maMon)
        .input('SiSoMax', sql.Int, siSoMax)
        .input('MSCB', sql.VarChar(10), mscb || null)
        .execute('proc_ThemLopHoc');
    
    const row = result.recordset[0];
    if (row.Success === 0) {
        throw new Error(row.Message);
    }

    return { success: true, message: row.Message, maLop: row.MaLopMoi };
  } catch (err) { throw err; }
};

// Sửa lớp học (Chỉ sửa sĩ số, giảng viên, trạng thái hủy)
const updateClass = async (id, data) => {
   
    try {
        const pool = await getPool();
        const { maHK, maMon, siSoMax, mscb, huyLop } = data; // id = maLop

        await pool.request()
            .input('maLop', sql.VarChar, id)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('siSoMax', sql.Int, siSoMax)
            .input('mscb', sql.VarChar, mscb)
            .input('daHuy', sql.Bit, huyLop ? 1 : 0)
            .query(`
                UPDATE LopHoc 
                SET SiSoToiDa = @siSoMax, MSCB = @mscb, DaHuy = @daHuy
                WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Xóa lớp học
const deleteClass = async (maLop, maHK, maMon) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query('DELETE FROM LopHoc WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon');
        return { success: true };
    } catch (err) { throw err; }
};

// Lấy danh sách Giảng viên (để đổ vào dropdown)
const getAllLecturers = async () => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT MSCB, HoTen, Khoa FROM GiangVien");
        return result.recordset;
    } catch (err) { throw err; }
};

// Lấy danh sách sinh viên trong lớp
const getStudentsByClass = async (maLop, maHK, maMon) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(`
                SELECT sv.MSSV, sv.HoTen
                FROM DangKy dk
                JOIN SinhVien sv ON dk.MSSV = sv.MSSV
                WHERE dk.MaLopHoc = @maLop AND dk.MaHocKy = @maHK AND dk.MaMon = @maMon
            `);
        return result.recordset;
    } catch (err) { throw err; }
};

// Xóa sinh viên khỏi lớp
const removeStudentFromClass = async (maLop, maHK, maMon, mssv) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('mssv', sql.VarChar, mssv)
            .query(`
                DELETE FROM DangKy 
                WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMon = @maMon AND MSSV = @mssv
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Xóa nhiều lớp học
const deleteMultipleClasses = async (classes) => {
    try {
        const pool = await getPool();
        let deletedCount = 0;

        for (const cls of classes) {
            const { maLop, maHK, maMon } = cls;
            
            if (!maLop || !maHK || !maMon) {
                console.warn('Thiếu thông tin lớp học:', cls);
                continue;
            }

            const result = await pool.request()
                .input('maLop', sql.VarChar, maLop)
                .input('maHK', sql.VarChar, maHK)
                .input('maMon', sql.VarChar, maMon)
                .query('DELETE FROM LopHoc WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon');
            
            deletedCount += result.rowsAffected[0];
        }

        return deletedCount;
    } catch (err) { 
        throw err; 
    }
};

// Lấy cấu trúc điểm của lớp học (Lịch sử hoặc Hiện tại)
const getClassGradeStructure = async (maLop, maHK, maMon) => {
    try {
        const pool = await getPool();
        
        // 1. TRƯỜNG HỢP A: CÓ RỒI (Lớp đang học - Đã có điểm trong ChiTietDiem)
        // Lấy cấu trúc điểm từ lịch sử ChiTietDiem
        const historyQuery = `
            SELECT DISTINCT c.ThanhPhanDiem, c.TyTrong
            FROM ChiTietDiem ctd
            JOIN CauTrucDiem c ON ctd.MaCauTruc = c.MaCauTruc
            WHERE ctd.MaLopHoc = @maLop AND ctd.MaHocKy = @maHK AND ctd.MaMon = @maMon
        `;
        const historyResult = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(historyQuery);

        if (historyResult.recordset.length > 0) {
            const grades = {};
            historyResult.recordset.forEach(g => grades[g.ThanhPhanDiem] = g.TyTrong);
            return { source: 'history', grades };
        }

        // 2. TRƯỜNG HỢP B: CHƯA CÓ (Lớp mới - Chưa có điểm)
        // Lấy cấu trúc điểm HIỆN TẠI của môn học (TrangThai = 1)
        const activeQuery = `
            SELECT ThanhPhanDiem, TyTrong
            FROM CauTrucDiem
            WHERE MaMon = @maMon AND TrangThai = 1
        `;
        const activeResult = await pool.request()
            .input('maMon', sql.VarChar, maMon)
            .query(activeQuery);

        const grades = {};
        activeResult.recordset.forEach(g => grades[g.ThanhPhanDiem] = g.TyTrong);
        return { source: 'active', grades };

    } catch (err) { throw err; }
};

module.exports = { getClassesBySemester, createClass, updateClass, deleteClass, getAllLecturers, deleteMultipleClasses, getStudentsByClass, removeStudentFromClass, getClassGradeStructure };
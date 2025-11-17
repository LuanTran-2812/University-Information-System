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
    const { maLop, maHK, maMon, siSoMax, mscb } = data;

    // Kiểm tra trùng (1 môn chỉ có 1 mã lớp trong 1 học kỳ)
    const check = await pool.request()
        .input('maLop', sql.VarChar, maLop)
        .input('maHK', sql.VarChar, maHK)
        .input('maMon', sql.VarChar, maMon)
        .query('SELECT * FROM LopHoc WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon');
    
    if (check.recordset.length > 0) throw new Error('Lớp học này đã tồn tại!');

    await pool.request()
        .input('maLop', sql.VarChar, maLop)
        .input('maHK', sql.VarChar, maHK)
        .input('maMon', sql.VarChar, maMon)
        .input('siSoMax', sql.Int, siSoMax)
        .input('mscb', sql.VarChar, mscb)
        .query(`
            INSERT INTO LopHoc (MaLopHoc, MaHocKy, MaMonHoc, SiSoToiDa, MSCB)
            VALUES (@maLop, @maHK, @maMon, @siSoMax, @mscb)
        `);
    return { success: true };
  } catch (err) { throw err; }
};

// Sửa lớp học (Chỉ sửa sĩ số, giảng viên)
const updateClass = async (id, data) => {
   
    try {
        const pool = await getPool();
        const { maHK, maMon, siSoMax, mscb } = data; // id = maLop

        await pool.request()
            .input('maLop', sql.VarChar, id)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('siSoMax', sql.Int, siSoMax)
            .input('mscb', sql.VarChar, mscb)
            .query(`
                UPDATE LopHoc 
                SET SiSoToiDa = @siSoMax, MSCB = @mscb
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
        const result = await pool.request().query("SELECT MSCB, HoTen FROM GiangVien");
        return result.recordset;
    } catch (err) { throw err; }
};

module.exports = { getClassesBySemester, createClass, updateClass, deleteClass, getAllLecturers };
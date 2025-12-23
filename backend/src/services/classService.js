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

// Lấy danh sách môn dạy của giảng viên (Gộp lớp L01, L02...)
// backend/src/services/classService.js

const getLecturerCourses = async (email, maHK) => {
    try {
        const pool = await getPool();
        
        // BƯỚC 1: Lấy Mã Giảng Viên (MSCB) từ Email trước
        // Cách này an toàn hơn việc JOIN trực tiếp nếu dữ liệu không đồng bộ
        const gvRes = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT MSCB FROM GiangVien WHERE Email = @email");
            
        const mscb = gvRes.recordset[0]?.MSCB;
        
        // Nếu không tìm thấy GV, trả về rỗng luôn (tránh lỗi query sau)
        if (!mscb) return []; 

        // BƯỚC 2: Truy vấn danh sách môn học đơn giản hơn
        // Thay vì SUM/GROUP BY phức tạp, ta lấy danh sách thô rồi xử lý bằng JS nếu cần,
        // hoặc dùng câu query tối giản này:
        const result = await pool.request()
            .input('mscb', sql.VarChar, mscb)
            .input('maHK', sql.VarChar, maHK)
            .query(`
                SELECT 
                    mh.MaMon, 
                    mh.TenMon, 
                    mh.SoTinChi,
                    -- Gom nhóm lớp: L01, L02
                    STRING_AGG(lh.MaLopHoc, ', ') WITHIN GROUP (ORDER BY lh.MaLopHoc) AS DanhSachLop,
                    -- Tính tổng sinh viên: Chuyển NULL thành 0 trước khi cộng
                    SUM(ISNULL(lh.SiSoHienTai, 0)) AS TongSinhVien
                FROM LopHoc lh
                JOIN MonHoc mh ON lh.MaMonHoc = mh.MaMon
                WHERE lh.MSCB = @mscb AND lh.MaHocKy = @maHK
                GROUP BY mh.MaMon, mh.TenMon, mh.SoTinChi
            `);

        return result.recordset;
    } catch (err) { 
        console.error("Lỗi SQL getLecturerCourses:", err); // In lỗi ra console server để debug
        throw err; 
    }
};

const getClassesForGradeManagement = async (email, maHK) => {
    try {
        const pool = await getPool();
        
        // 1. Lấy MSCB
        const gv = await pool.request().input('email', sql.NVarChar, email).query("SELECT MSCB FROM GiangVien WHERE Email = @email");
        if(gv.recordset.length === 0) return [];
        const mscb = gv.recordset[0].MSCB;

        // 2. Lấy danh sách lớp chi tiết
        const result = await pool.request()
            .input('mscb', sql.VarChar, mscb)
            .input('maHK', sql.VarChar, maHK)
            .query(`
                SELECT 
                    lh.MaLopHoc, 
                    mh.MaMon, 
                    mh.TenMon, 
                    mh.SoTinChi,
                    lh.SiSoHienTai,
                    lh.SiSoToiDa
                FROM LopHoc lh
                JOIN MonHoc mh ON lh.MaMonHoc = mh.MaMon
                WHERE lh.MSCB = @mscb AND lh.MaHocKy = @maHK
                ORDER BY mh.TenMon, lh.MaLopHoc
            `);

        return result.recordset;
    } catch (err) { throw err; }
};

module.exports = { 
    getClassesBySemester, 
    createClass, 
    updateClass, 
    deleteClass, 
    getAllLecturers,
    getLecturerCourses,
    getClassesForGradeManagement
};
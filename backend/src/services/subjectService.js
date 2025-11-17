const { getPool, sql } = require('../config/db');

const getAllSubjects = async () => {
  try {
    const pool = await getPool();
    
    // Kỹ thuật: Dùng STRING_AGG để gộp nhiều môn tiên quyết vào 1 dòng (ngăn cách bằng dấu phẩy)
    // LEFT JOIN để lấy cả những môn không có tiên quyết
    const query = `
      SELECT 
        m.MaMon, 
        m.TenMon, 
        m.SoTinChi, 
        m.KhoaPhuTrach, 
        m.MaMonSongHanh,
        STRING_AGG(tq.MaMonTienQuyet, ', ') AS MonTienQuyet
      FROM MonHoc m
      LEFT JOIN MonTienQuyet tq ON m.MaMon = tq.MaMon
      GROUP BY m.MaMon, m.TenMon, m.SoTinChi, m.KhoaPhuTrach, m.MaMonSongHanh
    `;
    
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

const createSubject = async (data) => {
    try {
      const pool = await getPool();
      const { maMon, tenMon, soTinChi, khoa, maMonSongHanh, maMonTienQuyet } = data;
  
      // 1. Thêm vào bảng MonHoc
      await pool.request()
        .input('maMon', sql.VarChar, maMon)
        .input('tenMon', sql.NVarChar, tenMon)
        .input('soTinChi', sql.Int, soTinChi)
        .input('khoa', sql.NVarChar, khoa)
        .input('songHanh', sql.VarChar, maMonSongHanh || null) 
        .query(`
          INSERT INTO MonHoc (MaMon, TenMon, SoTinChi, KhoaPhuTrach, MaMonSongHanh)
          VALUES (@maMon, @tenMon, @soTinChi, @khoa, @songHanh)
        `);
  
      // 2. Thêm vào bảng MonTienQuyet (Nếu có chọn)
      if (maMonTienQuyet) {
        await pool.request()
          .input('maMon', sql.VarChar, maMon)
          .input('tienQuyet', sql.VarChar, maMonTienQuyet)
          .query(`INSERT INTO MonTienQuyet (MaMon, MaMonTienQuyet) VALUES (@maMon, @tienQuyet)`);
      }
  
      return { success: true };
    } catch (err) {
      throw err;
    }
  };
  
  // HÀM SỬA (UPDATE)
const updateSubject = async (id, data) => {
    try {
      const pool = await getPool();
      const { tenMon, soTinChi, khoa, maMonSongHanh, maMonTienQuyet } = data;
  
      // 1. Cập nhật bảng chính MonHoc
      await pool.request()
        .input('id', sql.VarChar, id)
        .input('tenMon', sql.NVarChar, tenMon)
        .input('soTinChi', sql.Int, soTinChi)
        .input('khoa', sql.NVarChar, khoa)
        .input('songHanh', sql.VarChar, maMonSongHanh || null)
        .query(`
          UPDATE MonHoc 
          SET TenMon = @tenMon, SoTinChi = @soTinChi, KhoaPhuTrach = @khoa, MaMonSongHanh = @songHanh
          WHERE MaMon = @id
        `);
  
      // 2. Cập nhật bảng MonTienQuyet (Xóa cũ -> Thêm mới)
      await pool.request().input('id', sql.VarChar, id).query("DELETE FROM MonTienQuyet WHERE MaMon = @id");
  
      if (maMonTienQuyet) {
        await pool.request()
          .input('id', sql.VarChar, id)
          .input('tienQuyet', sql.VarChar, maMonTienQuyet)
          .query("INSERT INTO MonTienQuyet (MaMon, MaMonTienQuyet) VALUES (@id, @tienQuyet)");
      }
  
      return { success: true };
    } catch (err) { throw err; }
  };
  
  // HÀM XÓA (DELETE)
  const deleteSubject = async (id) => {
    try {
      const pool = await getPool();
      // Xóa ràng buộc trước cho an toàn
      await pool.request().input('id', sql.VarChar, id).query("DELETE FROM MonTienQuyet WHERE MaMon = @id");
      // Xóa môn học
      await pool.request().input('id', sql.VarChar, id).query("DELETE FROM MonHoc WHERE MaMon = @id");
      
      return { success: true };
    } catch (err) { throw err; }
  };
  
 
  module.exports = { getAllSubjects, createSubject, updateSubject, deleteSubject };
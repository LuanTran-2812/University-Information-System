const { getPool, sql } = require('../config/db'); 

const getAllSemesters = async () => {
   
    try {
        const pool = await getPool();
        const result = await pool.request().query('SELECT * FROM v_ThongTinHocKy ORDER BY NamHoc DESC, MaHocKy DESC');
        return result.recordset;
    } catch (err) {
        throw err;
    }
};

const createSemester = async (data) => {
    
    try {
        const pool = await getPool();
        const { maHK, namHoc, ngayBatDau, ngayKetThuc, moDangKy, dongDangKy } = data;

        // Kiểm tra trùng
        const check = await pool.request()
            .input('maHK', sql.VarChar, maHK)
            .query('SELECT * FROM HocKy WHERE MaHocKy = @maHK');
        
        if (check.recordset.length > 0) throw new Error('Mã học kỳ này đã tồn tại!');

        // Insert
        await pool.request()
            .input('maHK', sql.VarChar, maHK)
            .input('namHoc', sql.VarChar, namHoc)
            .input('ngayBD', sql.Date, ngayBatDau)
            .input('ngayKT', sql.Date, ngayKetThuc)
            .input('moDK', sql.Date, moDangKy)
            .input('dongDK', sql.Date, dongDangKy)
            .query(`
                INSERT INTO HocKy (MaHocKy, NamHoc, NgayBatDau, NgayKetThuc, MoDangKy, DongDangKy)
                VALUES (@maHK, @namHoc, @ngayBD, @ngayKT, @moDK, @dongDK)
            `);
        return { success: true };
    } catch (err) {
        throw err;
    }
};

const updateSemester = async (id, data) => {
  try {
      const pool = await getPool();
      const { namHoc, ngayBatDau, ngayKetThuc, moDangKy, dongDangKy, daKhoa } = data; // Thêm biến daKhoa

      await pool.request()
          .input('id', sql.VarChar, id)
          .input('namHoc', sql.VarChar, namHoc)
          .input('ngayBD', sql.Date, ngayBatDau)
          .input('ngayKT', sql.Date, ngayKetThuc)
          .input('moDK', sql.Date, moDangKy)
          .input('dongDK', sql.Date, dongDangKy)
          .input('daKhoa', sql.Bit, daKhoa) // Nhận thêm trạng thái khóa thủ công
          .query(`
              UPDATE HocKy 
              SET NamHoc = @namHoc, 
                  NgayBatDau = @ngayBD, NgayKetThuc = @ngayKT,
                  MoDangKy = @moDK, DongDangKy = @dongDK,
                  DaKhoa = @daKhoa
              WHERE MaHocKy = @id
          `);
      return { success: true };
  } catch (err) { throw err; }
};


const deleteSemester = async (id) => {
  try {
      const pool = await getPool();
      await pool.request()
          .input('id', sql.VarChar, id)
          .query('DELETE FROM HocKy WHERE MaHocKy = @id');
      return { success: true };
  } catch (err) { throw err; }
};

module.exports = { getAllSemesters, createSemester, updateSemester, deleteSemester };
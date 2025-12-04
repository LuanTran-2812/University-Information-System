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
      const { namHoc, ngayBatDau, ngayKetThuc, moDangKy, dongDangKy, daKhoa } = data; 
      
      let query = 'UPDATE HocKy SET ';
      const request = pool.request().input('id', sql.VarChar, id);
      const updates = [];
      
      // 1. Cập nhật trạng thái khóa (được dùng bởi nút 'Đóng học kỳ')
      if (daKhoa !== undefined) {
          updates.push('DaKhoa = @daKhoa');
          request.input('daKhoa', sql.Bit, daKhoa); 
      }
      
      // 2. Cập nhật thông tin cơ bản (được dùng bởi form Sửa)
      if (namHoc) {
          updates.push('NamHoc = @namHoc');
          request.input('namHoc', sql.VarChar, namHoc);
      }
      if (ngayBatDau) {
          updates.push('NgayBatDau = @ngayBD');
          request.input('ngayBD', sql.Date, ngayBatDau);
      }
      if (ngayKetThuc) {
          updates.push('NgayKetThuc = @ngayKT');
          request.input('ngayKT', sql.Date, ngayKetThuc);
      }
      if (moDangKy) {
          updates.push('MoDangKy = @moDK');
          request.input('moDK', sql.Date, moDangKy);
      }
      if (dongDangKy) {
          updates.push('DongDangKy = @dongDK');
          request.input('dongDK', sql.Date, dongDangKy);
      }
      
      if (updates.length === 0) {
          return { success: true, message: 'Không có dữ liệu thay đổi.' };
      }

      query += updates.join(', ');
      query += ' WHERE MaHocKy = @id';

      await request.query(query);
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
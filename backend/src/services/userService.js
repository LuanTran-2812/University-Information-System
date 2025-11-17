const { getPool, sql } = require('../config/db'); 

// Hàm lấy danh sách sinh viên 
const getAllStudents = async () => {
  try {
    const pool = await getPool();
    const query = `
      SELECT HoTen, Email, N'Sinh viên' as VaiTro FROM SinhVien
      UNION ALL
      SELECT HoTen, Email, N'Giảng viên' as VaiTro FROM GiangVien
    `;
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Hàm lấy danh sách Khoa 
const getAllFaculties = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT TenKhoa FROM Khoa');
    return result.recordset;
  } catch (err) {
    throw err;
  }
};

// Hàm thêm người dùng mới 
const createUser = async (userData) => {
  try {
    const pool = await getPool();
    // Lấy thêm biến 'khoa' từ dữ liệu gửi lên
    const { hoTen, email, matKhau, vaiTro, khoa } = userData; 

   
    const checkUser = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM TaiKhoan WHERE Email = @email');
    if (checkUser.recordset.length > 0) throw new Error('Email này đã được sử dụng!');

   
    await pool.request()
      .input('email', sql.NVarChar, email)
      .input('matKhau', sql.VarChar, matKhau)
      .input('vaiTro', sql.NVarChar, vaiTro)
      .query('INSERT INTO TaiKhoan (Email, MatKhau, VaiTro) VALUES (@email, @matKhau, @vaiTro)');

    // Tạo ID ngẫu nhiên
    const randomId = Math.floor(Math.random() * 100000);
    
    // Insert vào bảng chi tiết với KHOA ĐỘNG
    if (vaiTro === 'Sinh viên') {
      const mssv = 'SV' + randomId;
      await pool.request()
        .input('khoa', sql.NVarChar, khoa) 
        .query(`INSERT INTO SinhVien (MSSV, Email, HoTen, ChuyenNganh, Khoa, GPA) 
                VALUES ('${mssv}', '${email}', N'${hoTen}', N'Chưa phân ngành', @khoa, 0)`);
    } else {
      const mscb = 'GV' + randomId;
      await pool.request()
        .input('khoa', sql.NVarChar, khoa) 
        .query(`INSERT INTO GiangVien (MSCB, Email, HoTen, ChuyenNganh, Khoa) 
                VALUES ('${mscb}', '${email}', N'${hoTen}', N'Chưa phân ngành', @khoa)`);
    }

    return { success: true, message: 'Tạo người dùng thành công' };
  } catch (err) {
    throw err;
  }
};

module.exports = { getAllStudents, createUser, getAllFaculties };

const getUserDetail = async (email) => {
  try {
    const pool = await getPool();
    
    // 1. Tìm trong bảng SinhVien
    let result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT *, N\'Sinh viên\' as VaiTro FROM SinhVien WHERE Email = @email');
    
    // 2. Nếu không thấy, tìm trong bảng GiangVien
    if (result.recordset.length === 0) {
      result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('SELECT *, N\'Giảng viên\' as VaiTro FROM GiangVien WHERE Email = @email');
    }

    return result.recordset[0]; // Trả về 1 đối tượng user duy nhất
  } catch (err) {
    throw err;
  }
};



const deleteUser = async (email) => {
  try {
    const pool = await getPool();
    // Xóa trong bảng TaiKhoan -> Tự động xóa bên SinhVien/GiangVien nhờ cơ chế Cascade
    await pool.request()
      .input('email', sql.NVarChar, email)
      .query('DELETE FROM TaiKhoan WHERE Email = @email');
    
    return { success: true };
  } catch (err) {
    throw err;
  }
};

// Nhớ export thêm hàm deleteUser
module.exports = { getAllStudents, createUser, getAllFaculties, getUserDetail, deleteUser };
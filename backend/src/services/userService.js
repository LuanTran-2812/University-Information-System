const { getPool, sql } = require('../config/db'); 

// Hàm lấy danh sách sinh viên 
const getAllStudents = async () => {
  try {
    const pool = await getPool();
    const query = `
      SELECT HoTen, Email, MSSV, Khoa, N'Sinh viên' as VaiTro FROM SinhVien
      UNION ALL
      SELECT HoTen, Email, MSCB, Khoa, N'Giảng viên' as VaiTro FROM GiangVien
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

// Hàm thêm người dùng mới - Sử dụng Stored Procedure
const createUser = async (userData) => {
  try {
    const pool = await getPool();
    const { hoTen, password, phone, address, role, faculty } = userData;

    // Gọi stored procedure proc_ThemNguoiDung
    const result = await pool.request()
      .input('HoTen', sql.NVarChar(100), hoTen)
      .input('MatKhau', sql.VarChar(100), password)
      .input('SDT', sql.VarChar(15), phone || null)
      .input('DiaChi', sql.NVarChar(200), address || null)
      .input('VaiTro', sql.NVarChar(20), role)
      .input('Khoa', sql.NVarChar(100), faculty)
      .execute('proc_ThemNguoiDung');

    // Kiểm tra kết quả từ procedure
    const resultData = result.recordset[0];
    
    // Lấy giá trị an toàn (case-insensitive)
    const isSuccess = resultData.Success === 1 || resultData.success === 1 || resultData.Success === true;
    const message = resultData.Message || resultData.message;
    const newCode = resultData.NewCode || resultData.newCode;
    const newEmail = resultData.NewEmail || resultData.newEmail;

    if (isSuccess) {
      return { 
        success: true, 
        message: message,
        newCode: newCode,
        newEmail: newEmail
      };
    } else {
      throw new Error(message);
    }
  } catch (err) {
    throw err;
  }
};

const getUserDetail = async (email) => {
  try {
    const pool = await getPool();
    
    // 1. Tìm trong bảng SinhVien và JOIN với TaiKhoan để lấy mật khẩu
    let result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT sv.*, tk.MatKhau, N'Sinh viên' as VaiTro 
        FROM SinhVien sv
        INNER JOIN TaiKhoan tk ON sv.Email = tk.Email
        WHERE sv.Email = @email
      `);
    
    // 2. Nếu không thấy, tìm trong bảng GiangVien
    if (result.recordset.length === 0) {
      result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query(`
          SELECT gv.*, tk.MatKhau, N'Giảng viên' as VaiTro 
          FROM GiangVien gv
          INNER JOIN TaiKhoan tk ON gv.Email = tk.Email
          WHERE gv.Email = @email
        `);
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

// Xóa nhiều người dùng
const deleteMultipleUsers = async (emails) => {
  try {
    const pool = await getPool();
    let deletedCount = 0;

    for (const email of emails) {
      if (!email) {
        console.warn('Email không hợp lệ:', email);
        continue;
      }

      const result = await pool.request()
        .input('email', sql.NVarChar, email)
        .query('DELETE FROM TaiKhoan WHERE Email = @email');
      
      deletedCount += result.rowsAffected[0];
    }

    return deletedCount;
  } catch (err) {
    throw err;
  }
};

// Nhớ export thêm hàm deleteUser và deleteMultipleUsers
module.exports = { getAllStudents, createUser, getAllFaculties, getUserDetail, deleteUser, deleteMultipleUsers };
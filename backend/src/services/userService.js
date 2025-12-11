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

// Helper function: Kiểm tra điều kiện xóa (Dùng chung cho Xóa đơn và Xóa nhiều)
const checkUserDeletionRules = async (transaction, email) => {
    // 1. Xác định User là Sinh viên hay Giảng viên
    const userCheck = await new sql.Request(transaction)
        .input('email', sql.VarChar, email)
        .query(`
            SELECT MSSV as ID, 'SV' as Type FROM SinhVien WHERE Email = @email
            UNION
            SELECT MSCB as ID, 'GV' as Type FROM GiangVien WHERE Email = @email
        `);

    // Nếu không tìm thấy trong cả 2 bảng (có thể là Admin hoặc rác trong TaiKhoan), cho phép xóa
    if (userCheck.recordset.length === 0) return null;

    const { ID, Type } = userCheck.recordset[0];

    // 2. Logic Kiểm tra Sinh Viên
    if (Type === 'SV') {
        // A. Kiểm tra Điểm số (Lịch sử không được xóa)
        const checkGrades = await new sql.Request(transaction)
            .input('mssv', sql.VarChar, ID)
            .query('SELECT TOP 1 1 FROM ChiTietDiem WHERE MSSV = @mssv');

        if (checkGrades.recordset.length > 0) {
            throw new Error(`Sinh viên ${ID} đã có bảng điểm. Không thể xóa dữ liệu học tập!`);
        }

        // B. Kiểm tra Đang học (Trách nhiệm hiện tại)
        const checkActive = await new sql.Request(transaction)
            .input('mssv', sql.VarChar, ID)
            .query(`
                SELECT TOP 1 mh.TenMon, lh.MaLopHoc
                FROM DangKy dk
                JOIN LopHoc lh ON dk.MaLopHoc = lh.MaLopHoc AND dk.MaHocKy = lh.MaHocKy AND dk.MaMon = lh.MaMonHoc
                JOIN MonHoc mh ON dk.MaMon = mh.MaMon
                WHERE dk.MSSV = @mssv
                  AND dk.TrangThai = N'Đã đăng ký'
            `);

        if (checkActive.recordset.length > 0) {
            const { TenMon, MaLopHoc } = checkActive.recordset[0];
            throw new Error(`Sinh viên ${ID} đang đứng tên trong lớp ${MaLopHoc} (${TenMon}). Vui lòng hủy môn trước khi xóa!`);
        }
    } 
    // 3. Logic Kiểm tra Giảng Viên
    else if (Type === 'GV') {
        const checkClasses = await new sql.Request(transaction)
            .input('mscb', sql.VarChar, ID)
            .query(`
                SELECT TOP 1 v.TrangThai, m.TenMon
                FROM LopHoc l
                JOIN v_ThongTinLopHoc v ON l.MaLopHoc = v.MaLopHoc AND l.MaHocKy = v.MaHocKy AND l.MaMonHoc = v.MaMonHoc
                JOIN MonHoc m ON l.MaMonHoc = m.MaMon
                WHERE l.MSCB = @mscb
                  AND v.TrangThai NOT IN (N'Đã kết thúc', N'Đã hủy lớp')
            `);

        if (checkClasses.recordset.length > 0) {
            const { TrangThai, TenMon } = checkClasses.recordset[0];
            throw new Error(`Giảng viên ${ID} đang phụ trách môn ${TenMon} (Trạng thái: ${TrangThai}). Vui lòng gỡ phân công trước!`);
        }
    }
    return null;
};

const deleteUser = async (email) => {
  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        // 1. Kiểm tra logic
        await checkUserDeletionRules(transaction, email);

        // 2. Thực hiện xóa Tài Khoan (Cascade sẽ tự xóa SinhVien/GiangVien)
        await new sql.Request(transaction)
            .input('email', sql.VarChar, email)
            .query('DELETE FROM TaiKhoan WHERE Email = @email');

        await transaction.commit();
        return { success: true };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
  } catch (err) { throw err; }
};

// Xóa nhiều người dùng
const deleteMultipleUsers = async (emails) => {
  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      let deletedCount = 0;

      for (const email of emails) {
        if (!email) continue;

        // 1. Kiểm tra logic từng người
        await checkUserDeletionRules(transaction, email);

        // 2. Xóa Parent table (Cascade sẽ tự xóa Child)
        const result = await new sql.Request(transaction)
          .input('email', sql.VarChar, email)
          .query('DELETE FROM TaiKhoan WHERE Email = @email');
        
        deletedCount += result.rowsAffected[0];
      }

      await transaction.commit();
      return deletedCount;

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) { throw err; }
};

// Nhớ export thêm hàm deleteUser và deleteMultipleUsers
module.exports = { getAllStudents, createUser, getAllFaculties, getUserDetail, deleteUser, deleteMultipleUsers };
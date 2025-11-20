const sql = require('mssql');
require('dotenv').config(); // Đảm bảo đọc được file .env

// Biến lưu kết nối (Singleton)
let poolPromise = null;

// Hàm lấy kết nối (Nếu chưa có thì tạo mới, có rồi thì dùng lại)
const getPool = () => {
  // 1. Nếu đã có kết nối rồi thì trả về luôn
  if (poolPromise) return poolPromise;

  // 2. Nếu chưa có, bắt đầu kết nối
  const connStr = process.env.MSSQL_CONNECTION_STRING;
  if (!connStr) {
    throw new Error('Lỗi: Không tìm thấy MSSQL_CONNECTION_STRING trong file .env');
  }

  poolPromise = new sql.ConnectionPool(connStr)
    .connect()
    .then((pool) => {
      console.log('✅ Đã kết nối tới SQL Server thành công!');
      return pool;
    })
    .catch((err) => {
      console.error('❌ Lỗi kết nối Database:', err);
      poolPromise = null; // Reset lại nếu lỗi
      throw err;
    });

  return poolPromise;
};

// Xuất khẩu hàm và biến sql
module.exports = {
  sql,      // Xuất khẩu thư viện sql để các file khác dùng (sql.NVarChar...)
  getPool   // Xuất khẩu HÀM (function) để các file khác gọi
};
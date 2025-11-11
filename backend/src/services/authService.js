const { getPool, sql } = require('../config/db');

async function getUserByEmail(email) {
  const pool = await getPool();
  const result = await pool.request()
    .input('Email', sql.NVarChar(255), email)
    .query('SELECT TOP (1) Email, VaiTro, MatKhau FROM [TaiKhoan] WHERE Email = @Email');
    console.log(result);
  return result.recordset[0] || null;
}

async function verifyPassword(plain, hash) {
    return plain == hash; 
}

module.exports = { getUserByEmail, verifyPassword };

const { getPool, sql } = require('../config/db');

/**
 * Tạo liên hệ mới trong bảng LienHe
 * @param {Object} contactData - { HoTen, Email, SDT, NoiDung }
 * @returns {Promise<Object>} - Kết quả insert
 */
const createContact = async (contactData) => {
  const { HoTen, Email, SDT, NoiDung } = contactData;

  // Validate: Kiểm tra tất cả các trường không được null/empty
  if (!HoTen || !Email || !SDT || !NoiDung) {
    throw new Error('Vui lòng nhập đầy đủ các thông tin.');
  }

//   // Validate email format
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   if (!emailRegex.test(Email)) {
//     throw new Error('Email không hợp lệ.');
//   }

//   // Validate phone number (chỉ số, độ dài 10-11 ký tự)
//   const phoneRegex = /^[0-9]{10,11}$/;
//   if (!phoneRegex.test(SDT)) {
//     throw new Error('Số điện thoại không hợp lệ.');
//   }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('HoTen', sql.NVarChar(100), HoTen.trim())
      .input('Email', sql.NVarChar(100), Email.trim())
      .input('SDT', sql.NVarChar(20), SDT.trim())
      .input('NoiDung', sql.NVarChar(sql.MAX), NoiDung.trim())
      .query(`
        INSERT INTO [LienHe] (HoTen, Email, SDT, NoiDung)
        VALUES (@HoTen, @Email, @SDT, @NoiDung)
      `);

    return {
      success: true,
      message: 'Đã gửi liên hệ thành công. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
      rowsAffected: result.rowsAffected[0]
    };
  } catch (error) {
    console.error('Database error:', error);
    throw new Error('Lỗi khi lưu thông tin liên hệ vào database.');
  }
};

module.exports = {
  createContact
};

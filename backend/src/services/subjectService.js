const { getPool, sql } = require('../config/db'); 

const getAllSubjects = async () => {
  try {
    const pool = await getPool();
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

const getSubjectDetail = async (id) => {
  try {
    const pool = await getPool();
    
    // 1. Lấy thông tin môn học và môn tiên quyết
    const subjectQuery = `
      SELECT 
        m.MaMon, m.TenMon, m.SoTinChi, m.KhoaPhuTrach, m.MaMonSongHanh,
        STRING_AGG(tq.MaMonTienQuyet, ',') AS MonTienQuyet
      FROM MonHoc m
      LEFT JOIN MonTienQuyet tq ON m.MaMon = tq.MaMon
      WHERE m.MaMon = @id
      GROUP BY m.MaMon, m.TenMon, m.SoTinChi, m.KhoaPhuTrach, m.MaMonSongHanh
    `;
    
    const subjectResult = await pool.request()
      .input('id', sql.VarChar, id)
      .query(subjectQuery);
      
    if (subjectResult.recordset.length === 0) return null;
    const subject = subjectResult.recordset[0];

    // 2. Lấy cấu trúc điểm
    const gradesQuery = `SELECT ThanhPhanDiem, TyTrong FROM CauTrucDiem WHERE MaMon = @id AND TrangThai = 1`;
    
    const gradesResult = await pool.request()
      .input('id', sql.VarChar, id)
      .query(gradesQuery);

    // Map cấu trúc điểm về object dễ dùng (Quiz: 10, Giữa kì: 30...)
    const grades = {};
    gradesResult.recordset.forEach(g => {
      grades[g.ThanhPhanDiem] = g.TyTrong;
    });
    
    return { ...subject, grades };
  } catch (err) {
    console.error('Error in getSubjectDetail:', err);
    throw err;
  }
};

const createSubject = async (data) => {
    try {
      const pool = await getPool();
      const { maMon, tenMon, soTinChi, khoa, maMonSongHanh, maMonTienQuyet, grades } = data;
      // grades là object { Quiz: 10, ThiNghiem: 0, ... }

      await pool.request()
        .input('MaMon', sql.VarChar(10), maMon)
        .input('TenMon', sql.NVarChar(150), tenMon)
        .input('SoTinChi', sql.Int, soTinChi)
        .input('KhoaPhuTrach', sql.NVarChar(100), khoa)
        .input('MaMonSongHanh', sql.VarChar(10), maMonSongHanh || null)
        .input('ListMaMonTienQuyet', sql.VarChar(sql.MAX), maMonTienQuyet || null) // Chuỗi 'CO1005,CO1007'
        .input('Quiz', sql.Int, grades?.Quiz || 0)
        .input('ThiNghiem', sql.Int, grades?.ThiNghiem || 0)
        .input('BTL', sql.Int, grades?.BTL || 0)
        .input('GiuaKy', sql.Int, grades?.GiuaKy || 0)
        .input('CuoiKy', sql.Int, grades?.CuoiKy || 0)
        .execute('proc_ThemMonHocMoi');
  
      return { success: true };
    } catch (err) {
      throw err;
    }
  };
  
// HÀM SỬA (UPDATE)
const updateSubject = async (id, data) => {
  try {
    const pool = await getPool();
    const { tenMon, soTinChi, khoa, maMonSongHanh, maMonTienQuyet, grades } = data;
    
    // Kiểm tra xem có đang trong đợt đăng ký không
    const checkDateQuery = `
        SELECT MaHocKy 
        FROM HocKy 
        WHERE GETDATE() BETWEEN MoDangKy AND DongDangKy
    `;

    // Validate tổng tỷ trọng
    const total = (grades?.Quiz || 0) + (grades?.ThiNghiem || 0) + (grades?.BTL || 0) + (grades?.GiuaKy || 0) + (grades?.CuoiKy || 0);
    if (total !== 100) {
      throw new Error('Tổng tỷ trọng điểm phải bằng 100%');
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);

      // 1. Cập nhật bảng MonHoc
      await request
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

      // 2. Cập nhật MonTienQuyet (Xóa hết -> Thêm lại)
      await request.query("DELETE FROM MonTienQuyet WHERE MaMon = @id");
      
      if (maMonTienQuyet && maMonTienQuyet.trim() !== '') {
          const listTQ = maMonTienQuyet.split(',').map(s => s.trim()).filter(s => s !== '');
          for (const tq of listTQ) {
              // Tạo request mới cho mỗi lệnh insert để tránh lỗi parameter trùng tên nếu dùng loop
              const reqTQ = new sql.Request(transaction); 
              await reqTQ
                  .input('maMon', sql.VarChar, id)
                  .input('tq', sql.VarChar, tq)
                  .query("INSERT INTO MonTienQuyet (MaMon, MaMonTienQuyet) VALUES (@maMon, @tq)");
          }
      }

      // 3. Cập nhật CauTrucDiem (Cập nhật trạng thái cũ -> Thêm mới)
      // A. Lấy cấu trúc hiện tại từ DB để so sánh
      const currentGradesResult = await request.query(`
          SELECT ThanhPhanDiem, TyTrong 
          FROM CauTrucDiem 
          WHERE MaMon = @id AND TrangThai = 1
      `);

      // Chuyển DB result về dạng object dễ so sánh: { 'Quiz': 10, 'Giữa kì': 30 }
      const currentGrades = {};
      currentGradesResult.recordset.forEach(g => {
          currentGrades[g.ThanhPhanDiem] = g.TyTrong;
      });

      // B. So sánh với dữ liệu Input
      const inputQuiz = grades?.Quiz || 0;
      const inputTN   = grades?.ThiNghiem || 0;
      const inputBTL  = grades?.BTL || 0;
      const inputGK   = grades?.GiuaKy || 0;
      const inputCK   = grades?.CuoiKy || 0;

      const dbQuiz = currentGrades['Quiz'] || 0;
      const dbTN   = currentGrades['Thí nghiệm'] || 0;
      const dbBTL  = currentGrades['BTL'] || 0;
      const dbGK   = currentGrades['Giữa kì'] || 0;
      const dbCK   = currentGrades['Cuối kì'] || 0;

      const isChanged = (
          inputQuiz !== dbQuiz ||
          inputTN   !== dbTN ||
          inputBTL  !== dbBTL ||
          inputGK   !== dbGK ||
          inputCK   !== dbCK
      );

      if (isChanged) {
        const dateResult = await pool.request().query(checkDateQuery);
        if (dateResult.recordset.length > 0) {
            throw new Error('Đang trong đợt đăng ký, cấm sửa cấu trúc điểm!');
        }

        await request.query("UPDATE CauTrucDiem SET TrangThai = 0 WHERE MaMon = @id");
        
        const insertGrade = async (type, name, value) => {
            if (value > 0) {
                const reqGrade = new sql.Request(transaction);
                await reqGrade
                    .input('id', sql.VarChar, id)
                    .input('maTP', sql.VarChar, `${id}_${type}`)
                    .input('tenTP', sql.NVarChar, name)
                    .input('tyTrong', sql.Int, value)
                    .query("INSERT INTO CauTrucDiem (MaThanhPhan, ThanhPhanDiem, TyTrong, MaMon, TrangThai) VALUES (@maTP, @tenTP, @tyTrong, @id, 1)");
            }
        };

        await insertGrade('Q', 'Quiz', grades?.Quiz || 0);
        await insertGrade('TN', 'Thí nghiệm', grades?.ThiNghiem || 0);
        await insertGrade('BTL', 'BTL', grades?.BTL || 0);
        await insertGrade('GK', 'Giữa kì', grades?.GiuaKy || 0);
        await insertGrade('CK', 'Cuối kì', grades?.CuoiKy || 0);
      }

      await transaction.commit();
      return { success: true };

    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) { throw err; }
};
  
// HÀM XÓA ĐƠN (DELETE)
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

// HÀM XÓA NHIỀU (BULK DELETE)
const deleteMultipleSubjects = async (ids = []) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Danh sách mã môn trống');
  }
  // Loại bỏ trùng lặp, làm sạch giá trị rỗng
  const cleaned = [...new Set(ids.filter(v => typeof v === 'string' && v.trim() !== ''))];
  if (cleaned.length === 0) throw new Error('Không có mã môn hợp lệ');

  try {
    const pool = await getPool();

    // Xóa ràng buộc MonTienQuyet trước
    // Tạo danh sách parameter động
    const tqReq = pool.request();
    cleaned.forEach((id, idx) => {
      tqReq.input(`id${idx}`, sql.VarChar, id);
    });
    const inListTQ = cleaned.map((_, idx) => `@id${idx}`).join(',');
    await tqReq.query(`DELETE FROM MonTienQuyet WHERE MaMon IN (${inListTQ})`);

    // Xóa môn học chính
    const mhReq = pool.request();
    cleaned.forEach((id, idx) => {
      mhReq.input(`id${idx}`, sql.VarChar, id);
    });
    const inListMH = cleaned.map((_, idx) => `@id${idx}`).join(',');
    const result = await mhReq.query(`DELETE FROM MonHoc WHERE MaMon IN (${inListMH})`);

    // result.rowsAffected là mảng; phần tử cuối chứa số dòng bị ảnh hưởng
    const deletedCount = Array.isArray(result.rowsAffected) ? result.rowsAffected.reduce((a,b)=>a+b,0) : 0;
    return { success: true, deletedCount };
  } catch (err) {
    throw err;
  }
};
  
module.exports = { getAllSubjects, getSubjectDetail, createSubject, updateSubject, deleteSubject, deleteMultipleSubjects };
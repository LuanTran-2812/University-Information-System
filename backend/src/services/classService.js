const { getPool, sql } = require('../config/db');

// Lấy danh sách lớp theo Học kỳ
const getClassesBySemester = async (maHocKy, filters = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('maHK', sql.VarChar, maHocKy);

    let whereClauses = ['lh.MaHocKy = @maHK'];

    if (filters.q) {
      request.input('q', sql.NVarChar, `%${filters.q}%`);
      whereClauses.push('(lh.MaLopHoc LIKE @q OR mh.TenMon LIKE @q)');
    }

    if (filters.status) {
      request.input('status', sql.NVarChar, filters.status);
      whereClauses.push('v.TrangThai = @status');
    }

    if (filters.lecturer) {
      request.input('lecturer', sql.NVarChar, `%${filters.lecturer}%`);
      whereClauses.push('gv.HoTen LIKE @lecturer');
    }

    const whereSql = whereClauses.join(' AND ');

    const query = `
        SELECT 
            lh.MaLopHoc, lh.MaHocKy, lh.MaMonHoc, lh.SiSoToiDa, lh.SiSoHienTai,
            mh.TenMon,
            gv.HoTen AS TenGiangVien, gv.MSCB,
            v.TrangThai -- Lấy trạng thái từ View v_ThongTinLopHoc
        FROM LopHoc lh
        LEFT JOIN MonHoc mh ON lh.MaMonHoc = mh.MaMon
        LEFT JOIN GiangVien gv ON lh.MSCB = gv.MSCB
        LEFT JOIN v_ThongTinLopHoc v ON lh.MaLopHoc = v.MaLopHoc AND lh.MaHocKy = v.MaHocKy AND lh.MaMonHoc = v.MaMonHoc
        WHERE ${whereSql}
      `;
    
    const result = await request.query(query);
    return result.recordset;
  } catch (err) { throw err; }
};

// Thêm lớp học
const createClass = async (data) => {
  try {
    const pool = await getPool();
    const { maHK, maMon, siSoMax, mscb } = data;

    const result = await pool.request()
        .input('MaHK', sql.VarChar(10), maHK)
        .input('MaMon', sql.VarChar(10), maMon)
        .input('SiSoMax', sql.Int, siSoMax)
        .input('MSCB', sql.VarChar(10), mscb || null)
        .execute('proc_ThemLopHoc');
    
    const row = result.recordset[0];
    if (row.Success === 0) {
        throw new Error(row.Message);
    }

    return { success: true, message: row.Message, maLop: row.MaLopMoi };
  } catch (err) { throw err; }
};

// Sửa lớp học (Chỉ sửa sĩ số, giảng viên, trạng thái hủy)
const updateClass = async (id, data) => {
   
    try {
        const pool = await getPool();
        const { maHK, maMon, siSoMax, mscb, huyLop } = data; // id = maLop

        await pool.request()
            .input('maLop', sql.VarChar, id)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('siSoMax', sql.Int, siSoMax)
            .input('mscb', sql.VarChar, mscb)
            .input('daHuy', sql.Bit, huyLop ? 1 : 0)
            .query(`
                UPDATE LopHoc 
                SET SiSoToiDa = @siSoMax, MSCB = @mscb, DaHuy = @daHuy
                WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Xóa lớp học
const deleteClass = async (maLop, maHK, maMon) => {
    try {
        const pool = await getPool();

        // 1. Lấy trạng thái từ View
        const checkStatus = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(`
                SELECT TrangThai 
                FROM v_ThongTinLopHoc 
                WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon
            `);

        if (checkStatus.recordset.length === 0) {
            throw new Error('Lớp học không tồn tại!');
        }

        const trangThai = checkStatus.recordset[0].TrangThai;

        // 2. XỬ LÝ LOGIC THEO TỪNG TRẠNG THÁI
        if (trangThai === 'Chưa xếp lịch') {
            await pool.request()
                .input('maLop', sql.VarChar, maLop)
                .input('maHK', sql.VarChar, maHK)
                .input('maMon', sql.VarChar, maMon)
                .query('DELETE FROM LopHoc WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon');
            
            return { success: true };

        } else if (trangThai === 'Đã xếp lịch') {
            throw new Error('Lớp học đang có Lịch học. Vui lòng sang trang "Quản lý lịch học" để xóa lịch trước khi xóa lớp!');

        } else if (trangThai === 'Kết thúc đăng ký') {
            throw new Error(`Lớp đang ở trạng thái "${trangThai}". Vui lòng sử dụng chức năng "Hủy lớp" thay vì xóa!`);

        } else {
            throw new Error(`Không thể xóa lớp học đang ở trạng thái "${trangThai}"!`);
        }

    } catch (err) { throw err; }
};

// Lấy danh sách Giảng viên (để đổ vào dropdown)
const getAllLecturers = async () => {
    try {
        const pool = await getPool();
        const result = await pool.request().query("SELECT MSCB, HoTen, Khoa FROM GiangVien");
        return result.recordset;
    } catch (err) { throw err; }
};

// Lấy danh sách môn dạy của giảng viên (Gộp lớp L01, L02...)
// backend/src/services/classService.js

const getLecturerCourses = async (email, maHK) => {
    try {
        const pool = await getPool();
        
        // BƯỚC 1: Lấy Mã Giảng Viên (MSCB) từ Email trước
        // Cách này an toàn hơn việc JOIN trực tiếp nếu dữ liệu không đồng bộ
        const gvRes = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT MSCB FROM GiangVien WHERE Email = @email");
            
        const mscb = gvRes.recordset[0]?.MSCB;
        
        // Nếu không tìm thấy GV, trả về rỗng luôn (tránh lỗi query sau)
        if (!mscb) return []; 

        // BƯỚC 2: Truy vấn danh sách môn học đơn giản hơn
        // Thay vì SUM/GROUP BY phức tạp, ta lấy danh sách thô rồi xử lý bằng JS nếu cần,
        // hoặc dùng câu query tối giản này:
        const result = await pool.request()
            .input('mscb', sql.VarChar, mscb)
            .input('maHK', sql.VarChar, maHK)
            .query(`
                SELECT 
                    mh.MaMon, 
                    mh.TenMon, 
                    mh.SoTinChi,
                    -- Gom nhóm lớp: L01, L02
                    STRING_AGG(lh.MaLopHoc, ', ') WITHIN GROUP (ORDER BY lh.MaLopHoc) AS DanhSachLop,
                    -- Tính tổng sinh viên: Chuyển NULL thành 0 trước khi cộng
                    SUM(ISNULL(lh.SiSoHienTai, 0)) AS TongSinhVien
                FROM LopHoc lh
                JOIN MonHoc mh ON lh.MaMonHoc = mh.MaMon
                WHERE lh.MSCB = @mscb AND lh.MaHocKy = @maHK
                GROUP BY mh.MaMon, mh.TenMon, mh.SoTinChi
            `);

        return result.recordset;
    } catch (err) { 
        console.error("Lỗi SQL getLecturerCourses:", err); // In lỗi ra console server để debug
        throw err; 
    }
};

const getClassesForGradeManagement = async (email, maHK) => {
    try {
        const pool = await getPool();
        
        // 1. Lấy MSCB
        const gv = await pool.request().input('email', sql.NVarChar, email).query("SELECT MSCB FROM GiangVien WHERE Email = @email");
        if(gv.recordset.length === 0) return [];
        const mscb = gv.recordset[0].MSCB;

        // 2. Lấy danh sách lớp chi tiết
        const result = await pool.request()
            .input('mscb', sql.VarChar, mscb)
            .input('maHK', sql.VarChar, maHK)
            .query(`
                SELECT 
                    lh.MaLopHoc, 
                    mh.MaMon, 
                    mh.TenMon, 
                    mh.SoTinChi,
                    lh.SiSoHienTai,
                    lh.SiSoToiDa
                FROM LopHoc lh
                JOIN MonHoc mh ON lh.MaMonHoc = mh.MaMon
                WHERE lh.MSCB = @mscb AND lh.MaHocKy = @maHK
                ORDER BY mh.TenMon, lh.MaLopHoc
            `);

        return result.recordset;
    } catch (err) { throw err; }
};

const getStudentCoursesWithGrades = async (email, maHK) => {
    try {
        const pool = await getPool();

        // 1. Lấy MSSV
        const svRes = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT MSSV FROM SinhVien WHERE Email = @email");
        
        const mssv = svRes.recordset[0]?.MSSV;
        if (!mssv) return [];

        // 2. Truy vấn dữ liệu môn học + Pivot điểm
        const query = `
            SELECT 
                DK.MaLopHoc,
                DK.MaMon,
                MH.TenMon,
                MH.SoTinChi,
                GV.HoTen AS TenGV,
                GV.Email AS EmailGV,
                
                -- PIVOT ĐIỂM (Chuyển dòng thành cột)
                MAX(CASE WHEN CT.ThanhPhanDiem = N'Giữa kì' THEN CD.Diem END) AS GK,
                MAX(CASE WHEN CT.ThanhPhanDiem = N'Cuối kì' THEN CD.Diem END) AS CK,
                MAX(CASE WHEN CT.ThanhPhanDiem = N'BTL' THEN CD.Diem END) AS BTL,
                MAX(CASE WHEN CT.ThanhPhanDiem = N'Quiz' THEN CD.Diem END) AS Quiz,
                MAX(CASE WHEN CT.ThanhPhanDiem = N'Thí nghiệm' THEN CD.Diem END) AS TN

            FROM DangKy DK
            JOIN LopHoc LH ON DK.MaLopHoc = LH.MaLopHoc AND DK.MaHocKy = LH.MaHocKy AND DK.MaMon = LH.MaMonHoc
            JOIN MonHoc MH ON DK.MaMon = MH.MaMon
            JOIN GiangVien GV ON LH.MSCB = GV.MSCB
            
            -- Join bảng điểm (Left join để lấy cả môn chưa có điểm)
            LEFT JOIN ChiTietDiem CD ON DK.MSSV = CD.MSSV 
                                     AND DK.MaLopHoc = CD.MaLopHoc 
                                     AND DK.MaHocKy = CD.MaHocKy
            
            -- Join cấu trúc điểm để biết loại điểm (GK, CK...)
            LEFT JOIN CauTrucDiem CT ON CD.MaCauTruc = CT.MaCauTruc

            WHERE DK.MSSV = @mssv 
              AND DK.MaHocKy = @maHK
              AND DK.TrangThai = N'Đã đăng ký'

            GROUP BY DK.MaLopHoc, DK.MaMon, MH.TenMon, MH.SoTinChi, GV.HoTen, GV.Email
        `;

        const res = await pool.request()
            .input('mssv', sql.VarChar, mssv)
            .input('maHK', sql.VarChar, maHK)
            .query(query);

        return res.recordset;
        } catch (err) { throw err; } // Đã thêm phần đóng ngoặc còn thiếu
};
// Lấy danh sách sinh viên trong lớp
const getStudentsByClass = async (maLop, maHK, maMon) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(`
                SELECT sv.MSSV, sv.HoTen
                FROM DangKy dk
                JOIN SinhVien sv ON dk.MSSV = sv.MSSV
                WHERE dk.MaLopHoc = @maLop AND dk.MaHocKy = @maHK AND dk.MaMon = @maMon
            `);
        return result.recordset;
    } catch (err) { throw err; }
};

// Xóa sinh viên khỏi lớp
const removeStudentFromClass = async (maLop, maHK, maMon, mssv) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .input('mssv', sql.VarChar, mssv)
            .query(`
                DELETE FROM DangKy 
                WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMon = @maMon AND MSSV = @mssv
            `);
        return { success: true };
    } catch (err) { throw err; }
};

// Xóa nhiều lớp học
const deleteMultipleClasses = async (classes) => {
    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        
        await transaction.begin();

        try {
            let deletedCount = 0;

            for (const cls of classes) {
                const { maLop, maHK, maMon } = cls;

                // 1. Kiểm tra Trạng thái và lấy Tên Môn
                const checkReq = new sql.Request(transaction);
                const checkRes = await checkReq
                    .input('maLop', sql.VarChar, maLop)
                    .input('maHK', sql.VarChar, maHK)
                    .input('maMon', sql.VarChar, maMon)
                    .query(`
                        SELECT V.TrangThai, M.TenMon 
                        FROM v_ThongTinLopHoc V
                        JOIN MonHoc M ON V.MaMonHoc = M.MaMon
                        WHERE V.MaLopHoc = @maLop AND V.MaHocKy = @maHK AND V.MaMonHoc = @maMon
                    `);

                // Nếu không tìm thấy lớp (có thể đã bị xóa trước đó), bỏ qua
                if (checkRes.recordset.length === 0) continue;

                const { TrangThai, TenMon } = checkRes.recordset[0];

                // 2. Validate Trạng thái
                if (TrangThai !== 'Chưa xếp lịch') {
                    let errorMsg = `Không thể xóa lớp ${maLop} - môn ${TenMon} (Trạng thái: ${TrangThai}). `;

                    if (TrangThai === 'Đã xếp lịch') {
                        errorMsg += 'Vui lòng xóa lịch học trước!';
                    } else if (TrangThai === 'Kết thúc đăng ký') {
                        errorMsg += 'Vui lòng dùng chức năng Hủy lớp!';
                    } else if (TrangThai === 'Đang đăng ký' || TrangThai === 'Đang học') {
                        errorMsg += 'Lớp đang hoạt động!';
                    }

                    throw new Error(errorMsg);
                }

                // 3. Xóa lớp hợp lệ
                const delReq = new sql.Request(transaction);
                const result = await delReq
                    .input('maLop', sql.VarChar, maLop)
                    .input('maHK', sql.VarChar, maHK)
                    .input('maMon', sql.VarChar, maMon)
                    .query('DELETE FROM LopHoc WHERE MaLopHoc = @maLop AND MaHocKy = @maHK AND MaMonHoc = @maMon');

                deletedCount += result.rowsAffected[0];
            }

            await transaction.commit(); // Xác nhận xóa tất cả nếu không có lỗi
            return deletedCount;

        } catch (err) {
            await transaction.rollback(); // Hoàn tác nếu có bất kỳ lỗi nào
            throw err;
        }
    } catch (err) { 
        throw err; 
    }
};

// Lấy cấu trúc điểm của lớp học (Lịch sử hoặc Hiện tại)
const getClassGradeStructure = async (maLop, maHK, maMon) => {
    try {
        const pool = await getPool();
        
        // 1. TRƯỜNG HỢP A: CÓ RỒI (Lớp đang học - Đã có điểm trong ChiTietDiem)
        // Lấy cấu trúc điểm từ lịch sử ChiTietDiem
        const historyQuery = `
            SELECT DISTINCT c.ThanhPhanDiem, c.TyTrong
            FROM ChiTietDiem ctd
            JOIN CauTrucDiem c ON ctd.MaCauTruc = c.MaCauTruc
            WHERE ctd.MaLopHoc = @maLop AND ctd.MaHocKy = @maHK AND ctd.MaMon = @maMon
        `;
        const historyResult = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(historyQuery);

        if (historyResult.recordset.length > 0) {
            const grades = {};
            historyResult.recordset.forEach(g => grades[g.ThanhPhanDiem] = g.TyTrong);
            return { source: 'history', grades };
        }

        // 2. TRƯỜNG HỢP B: CHƯA CÓ (Lớp mới - Chưa có điểm)
        // Lấy cấu trúc điểm HIỆN TẠI của môn học (TrangThai = 1)
        const activeQuery = `
            SELECT ThanhPhanDiem, TyTrong
            FROM CauTrucDiem
            WHERE MaMon = @maMon AND TrangThai = 1
        `;
        const activeResult = await pool.request()
            .input('maMon', sql.VarChar, maMon)
            .query(activeQuery);

        const grades = {};
        activeResult.recordset.forEach(g => grades[g.ThanhPhanDiem] = g.TyTrong);
        return { source: 'active', grades };

    } catch (err) { throw err; }
};

module.exports = { 
    getClassesBySemester, 
    createClass, 
    updateClass, 
    deleteClass, 
    getAllLecturers,
    getLecturerCourses,
    getClassesForGradeManagement,
    getStudentCoursesWithGrades,
  deleteMultipleClasses, getStudentsByClass, removeStudentFromClass, getClassGradeStructure
};

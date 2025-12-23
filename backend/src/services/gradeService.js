const { getPool, sql } = require('../config/db');

const getStudentGradesByClass = async (maLop, maMon, maHK) => {
    try {
        const pool = await getPool();
        
        // 1. Lấy cấu trúc điểm của môn học này
        const structRes = await pool.request()
            .input('maMon', sql.VarChar, maMon)
            .query("SELECT ThanhPhanDiem FROM CauTrucDiem WHERE MaMon = @maMon");
        
        const validComponents = structRes.recordset.map(row => row.ThanhPhanDiem);

        // 2. Lấy danh sách sinh viên và điểm
        // Sử dụng LEFT JOIN cẩn thận để tránh mất sinh viên chưa có điểm
        const result = await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maMon', sql.VarChar, maMon)
            .input('maHK', sql.VarChar, maHK)
            .query(`
                SELECT 
                    SV.MSSV, 
                    SV.HoTen, 
                    SV.SDT, 
                    SV.Email,
                    -- Pivot điểm sang cột ngang
                    MAX(CASE WHEN CT.ThanhPhanDiem = N'Giữa kì' THEN CD.Diem END) AS GK,
                    MAX(CASE WHEN CT.ThanhPhanDiem = N'Cuối kì' THEN CD.Diem END) AS CK,
                    MAX(CASE WHEN CT.ThanhPhanDiem = N'BTL' THEN CD.Diem END) AS BTL,
                    MAX(CASE WHEN CT.ThanhPhanDiem = N'Quiz' THEN CD.Diem END) AS Quiz,
                    MAX(CASE WHEN CT.ThanhPhanDiem = N'Thí nghiệm' THEN CD.Diem END) AS TN
                FROM DangKy DK
                JOIN SinhVien SV ON DK.MSSV = SV.MSSV
                -- Join bảng điểm (Quan trọng: Join bằng cả MaLop, MaMon, MaHK để lấy đúng điểm lớp này)
                LEFT JOIN ChiTietDiem CD ON DK.MSSV = CD.MSSV 
                                         AND DK.MaLopHoc = CD.MaLopHoc 
                                         AND DK.MaMon = CD.MaMon 
                                         AND DK.MaHocKy = CD.MaHocKy
                -- Join cấu trúc điểm để biết tên thành phần
                LEFT JOIN CauTrucDiem CT ON CD.MaCauTruc = CT.MaCauTruc
                
                WHERE DK.MaLopHoc = @maLop 
                  AND DK.MaMon = @maMon 
                  AND DK.MaHocKy = @maHK
                  AND DK.TrangThai = N'Đã đăng ký' -- Chỉ lấy sinh viên đang học
                
                GROUP BY SV.MSSV, SV.HoTen, SV.SDT, SV.Email
                ORDER BY SV.MSSV
            `);

        return {
            students: result.recordset,
            structure: validComponents
        };

    } catch (err) { 
        console.error("Lỗi SQL getStudentGradesByClass:", err); // In lỗi ra terminal để debug
        throw err; 
    }
};

const updateStudentGrades = async (data) => {
    try {
        const pool = await getPool();
        const { mssv, maLop, maMon, maHK, grades } = data; 

        // Duyệt qua từng loại điểm gửi lên
        for (const [tenThanhPhan, rawDiem] of Object.entries(grades)) {
            
            // 1. Xử lý giá trị điểm an toàn (Quan trọng!)
            let diemSo = null;
            if (rawDiem !== "" && rawDiem !== null && rawDiem !== undefined) {
                diemSo = parseFloat(rawDiem); // Chuyển sang số
                if (isNaN(diemSo)) diemSo = null; // Nếu không phải số thì cho là null
            }

            // 2. Tìm MaCauTruc
            const structRes = await pool.request()
                .input('ten', sql.NVarChar, tenThanhPhan)
                .input('maMon', sql.VarChar, maMon)
                .query("SELECT MaCauTruc FROM CauTrucDiem WHERE ThanhPhanDiem = @ten AND MaMon = @maMon");
            
            if (structRes.recordset.length === 0) continue; 
            
            const maCauTruc = structRes.recordset[0].MaCauTruc;

            // 3. Kiểm tra xem sinh viên đã có dòng điểm này chưa
            const checkRes = await pool.request()
                .input('mssv', sql.VarChar, mssv)
                .input('maLop', sql.VarChar, maLop)
                .input('maMon', sql.VarChar, maMon)
                .input('maHK', sql.VarChar, maHK)
                .input('maCauTruc', sql.Int, maCauTruc)
                .query(`SELECT MaDiem FROM ChiTietDiem 
                        WHERE MSSV = @mssv AND MaLopHoc = @maLop AND MaMon = @maMon AND MaHocKy = @maHK AND MaCauTruc = @maCauTruc`);

            if (checkRes.recordset.length > 0) {
                // UPDATE (Nếu diemSo là null thì update thành NULL trong DB luôn)
                await pool.request()
                    .input('diem', sql.Decimal(4,2), diemSo)
                    .input('maDiem', sql.VarChar, checkRes.recordset[0].MaDiem)
                    .query("UPDATE ChiTietDiem SET Diem = @diem WHERE MaDiem = @maDiem");
            } else if (diemSo !== null) {
                // INSERT (Chỉ insert nếu có điểm thực sự)
                const maDiem = `D_${Date.now()}_${Math.floor(Math.random()*10000)}`; 
                await pool.request()
                    .input('maDiem', sql.VarChar, maDiem)
                    .input('mssv', sql.VarChar, mssv)
                    .input('maLop', sql.VarChar, maLop)
                    .input('maMon', sql.VarChar, maMon)
                    .input('maHK', sql.VarChar, maHK)
                    .input('maCauTruc', sql.Int, maCauTruc)
                    .input('diem', sql.Decimal(4,2), diemSo)
                    .query(`
                        INSERT INTO ChiTietDiem (MaDiem, MSSV, MaLopHoc, MaMon, MaHocKy, MaCauTruc, Diem)
                        VALUES (@maDiem, @mssv, @maLop, @maMon, @maHK, @maCauTruc, @diem)
                    `);
            }
        }
        return { success: true };
    } catch (err) { 
        console.error("Lỗi SQL Update:", err);
        throw err; 
    }
};

module.exports = { getStudentGradesByClass, updateStudentGrades };
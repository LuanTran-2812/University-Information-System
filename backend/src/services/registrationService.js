const { getPool, sql } = require('../config/db');

// 1. Lấy danh sách lớp mở trong học kỳ (Kèm trạng thái đăng ký của SV)
const getOpenClasses = async (email, maHK) => {
    try {
        const pool = await getPool();
        
        // Lấy MSSV
        const svRes = await pool.request().input('email', sql.NVarChar, email).query("SELECT MSSV FROM SinhVien WHERE Email = @email");
        const mssv = svRes.recordset[0]?.MSSV;
        if (!mssv) return [];

        // --- QUERY ĐÃ SỬA: THÊM DISTINCT ---
        const query = `
            SELECT DISTINCT  -- <--- THÊM TỪ KHÓA NÀY
                LH.MaLopHoc,
                LH.MaMonHoc AS MaMon, 
                MH.TenMon,
                MH.SoTinChi,
                LH.SiSoHienTai,
                LH.SiSoToiDa,
                LH.MSCB,
                GV.HoTen AS TenGV,
                ISNULL(DK.TrangThai, N'Chưa đăng ký') AS TrangThaiDangKy
            FROM LopHoc LH
            JOIN MonHoc MH ON LH.MaMonHoc = MH.MaMon
            LEFT JOIN GiangVien GV ON LH.MSCB = GV.MSCB
            LEFT JOIN DangKy DK ON LH.MaLopHoc = DK.MaLopHoc 
                               AND LH.MaHocKy = DK.MaHocKy 
                               AND DK.MSSV = @mssv
            WHERE LH.MaHocKy = @maHK
        `;

        const res = await pool.request()
            .input('mssv', sql.VarChar, mssv)
            .input('maHK', sql.VarChar, maHK)
            .query(query);
            
        return res.recordset;
    } catch (err) { throw err; }
};

// 2. Xử lý Đăng ký hoặc Hủy
const toggleRegistration = async (email, maLop, maMon, maHK, action) => {
    try {
        const pool = await getPool();

        // 1. Kiểm tra thời hạn (Như đã làm trước đó)
        const dateCheck = await pool.request()
            .input('maHK', sql.VarChar, maHK)
            .query(`
                SELECT COUNT(*) as IsOpen
                FROM HocKy
                WHERE MaHocKy = @maHK
                AND CAST(GETDATE() AS DATE) BETWEEN MoDangKy AND DongDangKy
            `);

        if (dateCheck.recordset[0].IsOpen === 0) {
            return { success: false, message: "⚠️ Đã hết thời gian đăng ký/hủy môn học!" };
        }

        // 2. Lấy MSSV
        const svRes = await pool.request().input('email', sql.NVarChar, email).query("SELECT MSSV FROM SinhVien WHERE Email = @email");
        const mssv = svRes.recordset[0]?.MSSV;
        if (!mssv) return { success: false, message: "Không tìm thấy sinh viên" };

        // 3. THỰC HIỆN ĐĂNG KÝ / HỦY
        if (action === 'REGISTER') {
            // A. Kiểm tra sĩ số trước khi cho đăng ký
            // Chỉ kiểm tra nếu chưa từng đăng ký (để tránh lỗi khi đăng ký lại)
            const checkFull = await pool.request()
                .input('maLop', sql.VarChar, maLop)
                .input('maHK', sql.VarChar, maHK)
                .query("SELECT SiSoHienTai, SiSoToiDa FROM LopHoc WHERE MaLopHoc = @maLop AND MaHocKy = @maHK");
            
            const lop = checkFull.recordset[0];
            if (lop.SiSoHienTai >= lop.SiSoToiDa) {
                // Kiểm tra xem SV này có phải đang 'Đã hủy' muốn quay lại không? Nếu không phải thì báo đầy
                const checkStatus = await pool.request()
                    .input('mssv', sql.VarChar, mssv)
                    .input('maLop', sql.VarChar, maLop)
                    .query("SELECT TrangThai FROM DangKy WHERE MSSV = @mssv AND MaLopHoc = @maLop");
                
                if (!checkStatus.recordset[0] || checkStatus.recordset[0].TrangThai !== 'Đã hủy') {
                    return { success: false, message: "❌ Lớp đã đầy sĩ số!" };
                }
            }

            // B. Thực hiện lệnh MERGE (Thêm mới hoặc Update lại trạng thái)
            const query = `
                MERGE DangKy AS target
                USING (SELECT @mssv AS MSSV, @maLop AS MaLop, @maHK AS MaHK, @maMon AS MaMon) AS source
                ON (target.MSSV = source.MSSV AND target.MaLopHoc = source.MaLop AND target.MaHocKy = source.MaHK)
                WHEN MATCHED THEN
                    UPDATE SET TrangThai = N'Đã đăng ký', NgayDangKy = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (MSSV, MaLopHoc, MaMon, MaHocKy, TrangThai)
                    VALUES (@mssv, @maLop, @maMon, @maHK, N'Đã đăng ký');
            `;
            await pool.request()
                .input('mssv', sql.VarChar, mssv)
                .input('maLop', sql.VarChar, maLop)
                .input('maHK', sql.VarChar, maHK)
                .input('maMon', sql.VarChar, maMon)
                .query(query);

        } else if (action === 'CANCEL') {
            // Hủy: Update trạng thái
            const query = `
                UPDATE DangKy 
                SET TrangThai = N'Đã hủy' 
                WHERE MSSV = @mssv AND MaLopHoc = @maLop AND MaHocKy = @maHK
            `;
            await pool.request()
                .input('mssv', sql.VarChar, mssv)
                .input('maLop', sql.VarChar, maLop)
                .input('maHK', sql.VarChar, maHK)
                .query(query);
        }

        // 4. [QUAN TRỌNG NHẤT] CẬP NHẬT LẠI SĨ SỐ CHO LỚP HỌC
        // Tính tổng số sinh viên có trạng thái 'Đã đăng ký' và update ngược lại vào bảng LopHoc
        // Cách này đảm bảo không bao giờ sai số (+1/-1)
        const updateCountQuery = `
            UPDATE LopHoc
            SET SiSoHienTai = (
                SELECT COUNT(*) 
                FROM DangKy 
                WHERE MaLopHoc = @maLop 
                  AND MaHocKy = @maHK 
                  AND TrangThai = N'Đã đăng ký'
            )
            WHERE MaLopHoc = @maLop AND MaHocKy = @maHK
        `;
        
        await pool.request()
            .input('maLop', sql.VarChar, maLop)
            .input('maHK', sql.VarChar, maHK)
            .query(updateCountQuery);

        return { 
            success: true, 
            message: action === 'REGISTER' ? "Đăng ký thành công!" : "Hủy lớp thành công!" 
        };

    } catch (err) { 
        console.error(err);
        return { success: false, message: "Lỗi hệ thống: " + err.message }; 
    }
};

module.exports = { getOpenClasses, toggleRegistration };
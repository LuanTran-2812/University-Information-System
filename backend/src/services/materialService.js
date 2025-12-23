const { getPool, sql } = require('../config/db');

const getMaterialsByCourse = async (email, maMon, maHK) => {
    try {
        const pool = await getPool();
        
        // 1. Lấy MSCB
        const infoRes = await pool.request()
            .input('email', sql.NVarChar, email)
            .query("SELECT MSCB FROM GiangVien WHERE Email = @email");
        
        const mscb = infoRes.recordset[0]?.MSCB;
        if (!mscb) return { materials: [], classList: '' };

        // 2. Lấy danh sách lớp (Giữ nguyên để hiện trên Header)
        const classesRes = await pool.request()
            .input('mscb', sql.VarChar, mscb)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(`
                SELECT STRING_AGG(MaLopHoc, ', ') WITHIN GROUP (ORDER BY MaLopHoc) as LopDay
                FROM LopHoc WHERE MSCB = @mscb AND MaHocKy = @maHK AND MaMonHoc = @maMon
            `);
        const realClassList = classesRes.recordset[0]?.LopDay || '';

        // 3. Lấy danh sách tài liệu (ĐÃ SỬA: GỘP NHÓM)
        const materialsRes = await pool.request()
            .input('mscb', sql.VarChar, mscb)
            .input('maHK', sql.VarChar, maHK)
            .input('maMon', sql.VarChar, maMon)
            .query(`
                SELECT 
                    -- Lấy 1 ID đại diện (Max) để dùng cho việc Tải/Sửa
                    MAX(tl.MaTaiLieu) as MaTaiLieu,
                    tl.TenFile, 
                    tl.NgayTaiLen,
                    -- Gộp các lớp lại thành chuỗi "L01, L06"
                    STRING_AGG(tl.MaLopHoc, ', ') WITHIN GROUP (ORDER BY tl.MaLopHoc) as CacLop
                FROM TaiLieu tl
                JOIN LopHoc lh ON tl.MaLopHoc = lh.MaLopHoc AND tl.MaHocKy = lh.MaHocKy AND tl.MaMon = lh.MaMonHoc
                WHERE lh.MSCB = @mscb AND tl.MaHocKy = @maHK AND tl.MaMon = @maMon
                -- Gom nhóm theo Tên và Ngày đăng (những file giống nhau up cùng ngày sẽ gộp lại)
                GROUP BY tl.TenFile, tl.NgayTaiLen
                ORDER BY tl.NgayTaiLen DESC
            `);

        return {
            classList: realClassList,
            materials: materialsRes.recordset
        };

    } catch (err) { console.error(err); throw err; }
};

// 2. Hàm lấy dữ liệu file (Cho chức năng Download)
const getMaterialFile = async (id) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            // Lúc này mới cần lấy DuLieuFile (nặng)
            .query("SELECT TenFile, DuLieuFile, LoaiFile FROM TaiLieu WHERE MaTaiLieu = @id");
        return result.recordset[0];
    } catch (err) { throw err; }
};

// HÀM SỬA ĐƠN GIẢN (Chỉ sửa 1 dòng)
// backend/src/services/materialService.js

const updateMaterial = async (data) => {
    try {
        const pool = await getPool();
        const { id, name, file } = data; // id là MaTaiLieu của 1 dòng đại diện

        // 1. Tìm thông tin gốc để xác định nhóm (Dựa vào Tên cũ, Ngày cũ, Môn cũ)
        const oldInfo = await pool.request()
            .input('id', sql.VarChar, id)
            .query("SELECT TenFile, NgayTaiLen, MaMon, MaHocKy, MSCB FROM TaiLieu WHERE MaTaiLieu = @id");
            
        if (oldInfo.recordset.length === 0) throw new Error("Không tìm thấy tài liệu!");
        
        const { TenFile, NgayTaiLen, MaMon, MaHocKy, MSCB } = oldInfo.recordset[0];

        // 2. Chuẩn bị câu lệnh Update
        // Điều kiện WHERE: Cùng Tên cũ, Cùng Ngày, Cùng Môn, Cùng GV (để update hết các lớp)
        
        const request = pool.request()
            .input('oldName', sql.NVarChar, TenFile)
            .input('oldDate', sql.Date, NgayTaiLen)
            .input('maMon', sql.VarChar, MaMon)
            .input('maHK', sql.VarChar, MaHocKy)
            .input('mscb', sql.VarChar, MSCB)
            .input('newName', sql.NVarChar, name); // Tên mới

        let sqlQuery = "UPDATE TaiLieu SET TenFile = @newName";

        // Nếu có file mới thì update thêm cột File
        if (file) {
            const extension = '.' + file.originalName.split('.').pop();
            request.input('fileData', sql.VarBinary, file.buffer);
            request.input('fileType', sql.NVarChar, extension);
            sqlQuery += ", DuLieuFile = @fileData, LoaiFile = @fileType";
        }

        sqlQuery += ` WHERE TenFile = @oldName 
                        AND NgayTaiLen = @oldDate 
                        AND MaMon = @maMon 
                        AND MaHocKy = @maHK 
                        AND MSCB = @mscb`;

        await request.query(sqlQuery);
        
        return { success: true };
    } catch (err) { throw err; }
};

const createMaterial = async (data) => {
    try {
        const pool = await getPool();
        const { name, maMon, maHK, mscb, classes, file } = data;

        // Xác định loại file từ đuôi file hoặc mimeType (đơn giản lấy đuôi)
        const extension = '.' + file.originalName.split('.').pop();

        for (const maLop of classes) {
            const maTaiLieu = 'TL' + Math.floor(Math.random() * 10000000); // Random ID
            const today = new Date().toISOString().split('T')[0];

            await pool.request()
                .input('id', sql.VarChar, maTaiLieu)
                .input('mscb', sql.VarChar, mscb)
                .input('name', sql.NVarChar, name) // Tên bài giảng do GV nhập
                .input('fileData', sql.VarBinary, file.buffer) // Lưu file nhị phân
                .input('fileType', sql.NVarChar, extension) // .pdf, .docx...
                .input('date', sql.Date, today)
                .input('maLop', sql.VarChar, maLop)
                .input('maMon', sql.VarChar, maMon)
                .input('maHK', sql.VarChar, maHK)
                .query(`
                    INSERT INTO TaiLieu (MaTaiLieu, MSCB, TenFile, DuLieuFile, LoaiFile, NgayTaiLen, MaLopHoc, MaMon, MaHocKy)
                    VALUES (@id, @mscb, @name, @fileData, @fileType, @date, @maLop, @maMon, @maHK)
                `);
        }
        return { success: true };
    } catch (err) { throw err; }
};

// HÀM XÓA TÀI LIỆU (XÓA ĐỒNG LOẠT)
const deleteMaterial = async (id) => {
    try {
        const pool = await getPool();
        
        // 1. Lấy thông tin của file đại diện (để biết Tên và Ngày đăng)
        const info = await pool.request()
            .input('id', sql.VarChar, id)
            .query("SELECT TenFile, NgayTaiLen, MaMon, MaHocKy, MSCB FROM TaiLieu WHERE MaTaiLieu = @id");
            
        if (info.recordset.length === 0) return { success: false, message: "File không tồn tại" };
        
        const { TenFile, NgayTaiLen, MaMon, MaHocKy, MSCB } = info.recordset[0];

        // 2. Xóa TẤT CẢ các file có cùng Tên, Ngày, Môn của GV đó
        // (Xóa cả L01, L06...)
        await pool.request()
            .input('name', sql.NVarChar, TenFile)
            .input('date', sql.Date, NgayTaiLen)
            .input('maMon', sql.VarChar, MaMon)
            .input('maHK', sql.VarChar, MaHocKy)
            .input('mscb', sql.VarChar, MSCB)
            .query(`
                DELETE FROM TaiLieu 
                WHERE TenFile = @name 
                  AND NgayTaiLen = @date 
                  AND MaMon = @maMon 
                  AND MaHocKy = @maHK
                  AND MSCB = @mscb
            `);
        
        return { success: true };
    } catch (err) { throw err; }
};

module.exports = { 
    getMaterialsByCourse, 
    getMaterialFile,
    updateMaterial,
    createMaterial,
    deleteMaterial
};
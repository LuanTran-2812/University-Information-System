const materialService = require('../services/materialService');

const getMaterials = async (req, res, next) => {
    try {
        const { email, maMon, maHK } = req.query;

        

        const data = await materialService.getMaterialsByCourse(email, maMon, maHK);
        res.json({ success: true, data: data });
    } catch (err) { next(err); }
};

// Thêm hàm này để tải file
const downloadMaterial = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Gọi Service lấy dữ liệu file
        const fileData = await materialService.getMaterialFile(id);

        // Kiểm tra file có tồn tại và có dữ liệu không
        if (!fileData || !fileData.DuLieuFile) {
            return res.status(404).send("File không tồn tại hoặc nội dung bị rỗng.");
        }

        
        // Mã hóa tên file sang định dạng URL (Ví dụ: Ch%C6%B0%C6%A1ng%201.pdf)
        const fileNameEncoded = encodeURIComponent(fileData.TenFile);

        // Cấu hình Header chuẩn để trình duyệt hiểu tên file tiếng Việt
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${fileNameEncoded}`);
        // ------------------------------------------
        
        // Gửi dữ liệu binary
        res.send(fileData.DuLieuFile); 

    } catch (err) { 
        // In lỗi chi tiết ra Terminal của VS Code để bạn biết tại sao
        console.error("Lỗi DOWNLOAD:", err); 
        res.status(500).send("Lỗi server khi tải file (Xem terminal để biết chi tiết)."); 
    }
};

const updateMaterial = async (req, res, next) => {
    try {
        const { id, name, mscb } = req.body; 
        // Lưu ý: id ở đây là ID của file đại diện được chọn từ Frontend
        
        let fileData = null;
        if (req.file) {
            fileData = {
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype
            };
        }

        await materialService.updateMaterial({
            id, name, file: fileData
        });

        res.json({ success: true, message: "Cập nhật thành công!" });
    } catch (err) { next(err); }
};

const createMaterial = async (req, res, next) => {
    try {
        // Kiểm tra xem có file gửi lên không
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Vui lòng chọn file!" });
        }

        // Lấy dữ liệu từ Form Data
        // classes gửi lên dạng chuỗi JSON '["L01", "L02"]' nên cần parse ra
        const { name, maMon, maHK, mscb, classes } = req.body;
        const classList = JSON.parse(classes); 

        const fileData = {
            buffer: req.file.buffer, // Dữ liệu nhị phân của file
            originalName: req.file.originalname, // Tên gốc của file (ví dụ: slide.pdf)
            mimeType: req.file.mimetype // Loại file (ví dụ: application/pdf)
        };

        await materialService.createMaterial({
            name, maMon, maHK, mscb, 
            classes: classList,
            file: fileData
        });

        res.json({ success: true, message: "Thêm tài liệu thành công!" });
    } catch (err) { next(err); }
};

const deleteMaterial = async (req, res, next) => {
    try {
        const { id } = req.params; // Lấy id từ URL
        await materialService.deleteMaterial(id);
        res.json({ success: true, message: 'Xóa thành công!' });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

module.exports = { 
    getMaterials, 
    downloadMaterial,
    updateMaterial,
    createMaterial,
    deleteMaterial
 };
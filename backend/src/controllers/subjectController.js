const subjectService = require('../services/subjectService');

const getSubjects = async (req, res, next) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.json({
      success: true,
      data: subjects
    });
  } catch (err) {
    next(err);
  }
};

const getSubjectDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const subject = await subjectService.getSubjectDetail(id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy môn học' });
    }
    res.json({ success: true, data: subject });
  } catch (err) {
    next(err);
  }
};


const createSubject = async (req, res, next) => {
    try {
      await subjectService.createSubject(req.body);
      res.json({ success: true, message: 'Thêm môn học thành công!' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
  

const updateSubject = async (req, res, next) => {
    try {
      const { id } = req.params;
      await subjectService.updateSubject(id, req.body);
      res.json({ success: true, message: 'Cập nhật thành công!' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  };
  
const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await subjectService.deleteSubject(id);
    res.json({ success: true, message: 'Xóa thành công!' });
  } catch (err) {
    let clientMessage = 'Không thể xóa môn học này.';

    if (err.number === 547) {
      if (err.message.includes('LopHoc') || err.message.includes('fk_ma_mon_hoc')) {
        clientMessage = 'Không thể xóa: Môn học này đang có Lớp học hoạt động.';
      } else if (err.message.includes('MonTienQuyet') || err.message.includes('fk_montienquyet')) {
        clientMessage = 'Không thể xóa: Môn này đang là môn Tiên quyết của môn khác.';
      } else if (err.message.includes('fk_monsonghanh')) {
        clientMessage = 'Không thể xóa: Môn này đang là môn Song hành của môn khác.';
      } else if (err.message.includes('ChiTietDiem')) {
         clientMessage = 'Không thể xóa: Môn này đã có dữ liệu điểm sinh viên.';
      } else {
        clientMessage = 'Không thể xóa: Dữ liệu đang được sử dụng ở mục khác (Ràng buộc dữ liệu).';
      }
    } else {
        console.error(err);
        clientMessage = err.message;
    }

    res.status(400).json({ success: false, message: clientMessage });
  }
};

// BULK DELETE
const deleteMultipleSubjects = async (req, res) => {
  try {
    const { maMons } = req.body;
    const result = await subjectService.deleteMultipleSubjects(maMons);
    
    res.json({ 
      success: true, 
      message: `Đã xóa thành công ${result.deletedCount} môn học!`, 
      deletedCount: result.deletedCount 
    });

  } catch (err) {
    let clientMessage = 'Lỗi: Không thể xóa danh sách môn đã chọn.';

    if (err.number === 547) {
      if (err.message.includes('LopHoc') || err.message.includes('fk_ma_mon_hoc')) {
        clientMessage = 'Không thể xóa: Trong danh sách chọn có môn đang có Lớp học hoạt động.';
      } else if (err.message.includes('MonTienQuyet') || err.message.includes('fk_montienquyet')) {
        clientMessage = 'Không thể xóa: Có môn đang là Tiên quyết của môn khác.';
      } else if (err.message.includes('fk_monsonghanh')) { 
        clientMessage = 'Không thể xóa: Có môn đang là Song hành của môn khác.';
      } else if (err.message.includes('ChiTietDiem')) {
         clientMessage = 'Không thể xóa: Có môn đã lưu điểm số của sinh viên.';
      } else {
        clientMessage = 'Không thể xóa: Một số môn đang được sử dụng ở mục khác.';
      }
    } else {
        console.error("Bulk Delete Error:", err);
        clientMessage = err.message;
    }

    res.status(400).json({ success: false, message: clientMessage });
  }
};

module.exports = { getSubjects, getSubjectDetail, createSubject, updateSubject, deleteSubject, deleteMultipleSubjects };
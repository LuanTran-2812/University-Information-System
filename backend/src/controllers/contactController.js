const contactService = require('../services/contactService');

const createContact = async (req, res, next) => {
  try {
    const { HoTen, Email, SDT, NoiDung } = req.body;

    // Gọi service để xử lý
    const result = await contactService.createContact({
      HoTen,
      Email,
      SDT,
      NoiDung
    });

    res.status(201).json(result);
  } catch (error) {
    // Nếu là validation error, trả về 400 Bad Request
    if (error.message.includes('Vui lòng nhập') || 
        error.message.includes('không hợp lệ')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

module.exports = {
  createContact
};

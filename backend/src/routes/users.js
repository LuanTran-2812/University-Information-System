const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, checkRole } = require('../middleware/authMiddleware');

router.get('/students', verifyToken, checkRole(['admin']), userController.getStudents);
router.post('/create', userController.createUser);




// API: POST /api/users/create
router.post('/create', userController.createUser);



// API GET /api/users/faculties
router.get('/faculties', userController.getFaculties);




router.get('/detail', verifyToken, checkRole(['admin']), userController.getUserDetail); // API: GET /api/users/detail?email=...
router.delete('/delete/:email', verifyToken, checkRole(['admin']), userController.deleteUser);
router.post('/delete-multiple', verifyToken, checkRole(['admin']), userController.deleteMultipleUsers); // Xóa nhiều người dùng

router.put('/update-profile', userController.updateProfile);

module.exports = router;
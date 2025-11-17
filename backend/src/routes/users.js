const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/students', userController.getStudents);
router.post('/create', userController.createUser);




// API: POST /api/users/create
router.post('/create', userController.createUser);



// API GET /api/users/faculties
router.get('/faculties', userController.getFaculties);




router.get('/detail', userController.getUserDetail); // API: GET /api/users/detail?email=...
router.delete('/delete/:email', userController.deleteUser);

module.exports = router;
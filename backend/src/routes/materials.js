const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', materialController.getMaterials);
router.get('/download/:id', materialController.downloadMaterial);
router.put('/update', upload.single('file'), materialController.updateMaterial);
router.post('/create', upload.single('file'), materialController.createMaterial);
router.delete('/delete/:id', materialController.deleteMaterial);

module.exports = router;
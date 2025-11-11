const express = require('express');
const router = express.Router();

// Import sub-routers
const authRouter = require('./auth');

// Mount routers with prefixes
// - /api/auth -> authRouter (login/register)
router.use('/auth', authRouter);

module.exports = router;

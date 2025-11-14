const express = require('express');
const router = express.Router();

// Import sub-routers
const authRouter = require('./auth');
const contactRouter = require('./contact');

// Mount routers with prefixes
// - /api/auth -> authRouter (login/register)
router.use('/auth', authRouter);

// - /api/contact -> contactRouter
router.use('/contact', contactRouter);

module.exports = router;

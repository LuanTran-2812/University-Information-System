const express = require('express');
const router = express.Router();

const contactRouter = require('./contact');
const authRouter = require('./auth');
const dashboardRouter = require('./dashboard');
const userRouter = require('./users'); 
const semesterRouter = require('./semesters');
const subjectRouter = require('./subjects');
const classRouter = require('./classes');
const scheduleRouter = require('./schedules');
const materialRouter = require('./materials');
const gradeRouter = require('./grades');
const registrationRouter = require('./registration');

router.use('/contact', contactRouter);
router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/users', userRouter);      
router.use('/semesters', semesterRouter);
router.use('/subjects', subjectRouter);
router.use('/classes', classRouter);
router.use('/schedules', scheduleRouter);
router.use('/materials', materialRouter);
router.use('/grades', gradeRouter);
router.use('/registration', registrationRouter);


module.exports = router;
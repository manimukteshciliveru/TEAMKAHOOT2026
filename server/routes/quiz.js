const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const quizController = require('../controllers/quizController');
const multer = require('multer');
const path = require('path');

// Configure disk storage for the AI service to pick up files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(null, true); 
        }
    }
});

// @route   POST api/quiz/create
// @desc    Create a new quiz (Manual or AI generated)
router.post('/create', auth, upload.single('file'), quizController.createQuiz);

// @route   POST api/quiz/join
// @desc    Join a quiz by code
router.post('/join', auth, quizController.joinByCode);

// @route   GET api/quiz/my-quizzes
// @desc    Get all quizzes created by current user
router.get('/my-quizzes', auth, quizController.getMyQuizzes);

// @route   PUT api/quiz/publish/:id
// @desc    Publish/Unpublish a quiz
router.put('/publish/:id', auth, quizController.publishQuiz);

// @route   GET api/quiz/live
// @desc    Get all active quizzes for students
router.get('/live', auth, quizController.getLiveQuizzes);

// @route   GET api/quiz/stats
// @desc    Get performance stats for faculty
router.get('/stats', auth, quizController.getFacultyStats);

// @route   GET api/quiz/:id
// @desc    Get quiz by ID
router.get('/:id', auth, quizController.getQuizById);

// @route   POST api/quiz/submit
// @desc    Submit a quiz attempt
router.post('/submit', auth, quizController.submitAttempt);

// @route   DELETE api/quiz/:id
// @desc    Delete a quiz
router.delete('/:id', auth, quizController.deleteQuiz);

// @route   GET api/quiz/leaderboard/:quizId
// @desc    Get leaderboard for a quiz
router.get('/leaderboard/:quizId', auth, quizController.getLeaderboard);

// @route   GET api/quiz/history/student
// @desc    Get current student's quiz history (completed and missed)
router.get('/history/student', auth, quizController.getStudentHistory);

// @route   GET api/quiz/report/:id
// @desc    Get detailed student quiz report
router.get('/report/:id', auth, quizController.getStudentQuizReport);

// @route   GET api/quiz/faculty-report/:id
// @desc    Get detailed faculty analytics dashboard
router.get('/faculty-report/:id', auth, quizController.getQuizStats);

// @route   PUT api/quiz/:id
// @desc    Update a quiz
router.put('/:id', auth, quizController.updateQuiz);

// @route   POST api/quiz/generate
// @desc    Generate quiz questions without saving (for review)
router.post('/generate', auth, upload.single('file'), quizController.generateQuizQuestions);

module.exports = router;

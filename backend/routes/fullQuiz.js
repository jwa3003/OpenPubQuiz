// backend/routes/fullQuiz.js

const express = require('express');
const { getFullQuizById } = require('../controllers/fullQuizController.js');

const router = express.Router();
// GET /api/quiz/:quizId/full
router.get('/:quizId/full', getFullQuizById);

module.exports = router;

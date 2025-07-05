// backend/routes/quiz.js

const express = require('express');
const { getAllQuizzes, getQuizById, createQuiz, deleteQuiz, updateQuiz } = require('../controllers/quizController.js');

const router = express.Router();

// Get all quizzes
router.get('/', getAllQuizzes);
// Get quiz by ID
router.get('/:id', getQuizById);
// Create a new quiz
router.post('/', createQuiz);
// Update quiz name
router.put('/:id', updateQuiz);
// 🔥 DELETE quiz completely from DB
router.delete('/:id', deleteQuiz);

module.exports = router;

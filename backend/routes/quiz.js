// backend/routes/quiz.js
import express from 'express';
import { getAllQuizzes, getQuizById, createQuiz, deleteQuiz } from '../controllers/quizController.js';

const router = express.Router();

// Get all quizzes
router.get('/', getAllQuizzes);

// Get quiz by ID
router.get('/:id', getQuizById);

// Create a new quiz
router.post('/', createQuiz);

// 🔥 DELETE quiz completely from DB
router.delete('/:id', deleteQuiz);

export default router;

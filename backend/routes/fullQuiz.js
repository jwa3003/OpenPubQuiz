// backend/routes/fullQuiz.js
import express from 'express';
import { getFullQuizById } from '../controllers/fullQuizController.js';

const router = express.Router();

// GET /api/quiz/:quizId/full
router.get('/:quizId/full', getFullQuizById);

export default router;

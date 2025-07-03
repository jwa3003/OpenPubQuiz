// backend/routes/question.js
import express from 'express';
import {
  getQuestionsByQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion
} from '../controllers/questionController.js';

const router = express.Router();

router.get('/:quizId', getQuestionsByQuiz);

router.post('/', createQuestion);

router.put('/:id', updateQuestion);

router.delete('/:id', deleteQuestion);

export default router;

// backend/routes/answer.js
import express from 'express';
import {
  getAnswersByQuestion,
  createAnswer,
  updateAnswer,
  deleteAnswer
} from '../controllers/answerController.js';

const router = express.Router();

router.get('/:questionId', getAnswersByQuestion);

router.post('/', createAnswer);

router.put('/:id', updateAnswer);

router.delete('/:id', deleteAnswer);

export default router;

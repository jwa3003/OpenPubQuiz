import express from 'express';
import {
  createSession,
  getSessionById,
  updateSession,
  removeQuizFromSession
} from '../controllers/sessionController.js';

const router = express.Router();

router.post('/', createSession);

router.get('/:session_id', getSessionById);

router.put('/:session_id', updateSession);

router.delete('/:session_id/quiz', removeQuizFromSession);

export default router;


const express = require('express');
const { createSession, getSessionById, updateSession, removeQuizFromSession } = require('../controllers/sessionController.js');

const router = express.Router();

router.post('/', createSession);
router.get('/:session_id', getSessionById);
router.put('/:session_id', updateSession);
router.delete('/:session_id/quiz', removeQuizFromSession);

module.exports = router;

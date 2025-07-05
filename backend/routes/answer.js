// backend/routes/answer.js

const express = require('express');
const { getAnswersByQuestion, createAnswer, updateAnswer, deleteAnswer } = require('../controllers/answerController.js');

const router = express.Router();

router.get('/:questionId', getAnswersByQuestion);
router.post('/', createAnswer);
router.put('/:id', updateAnswer);
router.delete('/:id', deleteAnswer);

module.exports = router;

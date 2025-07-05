// backend/routes/question.js

const express = require('express');
const { getQuestionsByQuiz, createQuestion, updateQuestion, deleteQuestion } = require('../controllers/questionController.js');

const router = express.Router();

router.get('/:quizId', getQuestionsByQuiz);
router.post('/', createQuestion);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);

module.exports = router;

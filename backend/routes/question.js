const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all questions for a quiz
router.get('/quiz/:quizId', (req, res) => {
  const quizId = req.params.quizId;
  const sql = 'SELECT * FROM questions WHERE quiz_id = ?';
  db.all(sql, [quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get a specific question with its answers
router.get('/:questionId', (req, res) => {
  const questionId = req.params.questionId;

  const questionSql = 'SELECT * FROM questions WHERE id = ?';
  const answersSql = 'SELECT id, text, is_correct FROM answers WHERE question_id = ?';

  db.get(questionSql, [questionId], (err, question) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!question) return res.status(404).json({ error: 'Question not found' });

    db.all(answersSql, [questionId], (err, answers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ ...question, answers });
    });
  });
});

// Add a new question to a quiz
router.post('/', (req, res) => {
  const { quiz_id, text } = req.body;
  if (!quiz_id || !text) {
    return res.status(400).json({ error: 'quiz_id and text are required' });
  }

  const sql = 'INSERT INTO questions (quiz_id, text) VALUES (?, ?)';
  db.run(sql, [quiz_id, text], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, quiz_id, text });
  });
});

module.exports = router;

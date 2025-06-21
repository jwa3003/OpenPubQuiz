const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all answers for a question
router.get('/question/:questionId', (req, res) => {
  const questionId = req.params.questionId;
  const sql = 'SELECT id, text, is_correct FROM answers WHERE question_id = ?';

  db.all(sql, [questionId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add an answer to a question
router.post('/', (req, res) => {
  const { question_id, text, is_correct } = req.body;

  if (!question_id || !text) {
    return res.status(400).json({ error: 'question_id and text are required' });
  }

  const sql = 'INSERT INTO answers (question_id, text, is_correct) VALUES (?, ?, ?)';
  db.run(sql, [question_id, text, is_correct ? 1 : 0], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({
      id: this.lastID,
      question_id,
      text,
      is_correct: !!is_correct
    });
  });
});

module.exports = router;

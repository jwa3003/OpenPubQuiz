// backend/routes/question.js
const express = require('express');
const db = require('../db.js');

const router = express.Router();


// Get all questions for a quiz, grouped by category
router.get('/by-quiz/:quizId', (req, res) => {
  db.all('SELECT * FROM questions WHERE quiz_id = ?', [req.params.quizId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Get all questions for a category
router.get('/by-category/:categoryId', (req, res) => {
  db.all('SELECT * FROM questions WHERE category_id = ?', [req.params.categoryId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});


// Create a new question
router.post('/', (req, res) => {
  const { quiz_id, category_id, text, image_url } = req.body;
  if (!quiz_id || !category_id || !text) return res.status(400).json({ error: 'Missing quiz_id, category_id, or question text' });
  db.run('INSERT INTO questions (quiz_id, category_id, text, image_url) VALUES (?, ?, ?, ?)', [quiz_id, category_id, text, image_url || null], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true, id: this.lastID, quiz_id, category_id, text, image_url });
  });
});


// Update an existing question
router.put('/:id', (req, res) => {
  const { text, image_url, category_id } = req.body;
  db.run('UPDATE questions SET text = ?, image_url = ?, category_id = ? WHERE id = ?', [text, image_url || null, category_id, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

router.delete('/:id', (req, res) => {
  db.run('DELETE FROM questions WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

module.exports = router;

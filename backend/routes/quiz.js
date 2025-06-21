const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all quizzes
router.get('/', (req, res) => {
  db.all('SELECT * FROM quizzes', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST a new quiz
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Quiz name is required' });

  db.run('INSERT INTO quizzes (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name });
  });
});

module.exports = router;


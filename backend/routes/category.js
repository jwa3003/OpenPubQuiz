// backend/routes/category.js
const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Create a new category
router.post('/', (req, res) => {
  const { quiz_id, name, image_url } = req.body;
  if (!quiz_id || !name) return res.status(400).json({ error: 'Missing quiz_id or name' });
  db.run('INSERT INTO categories (quiz_id, name, image_url) VALUES (?, ?, ?)', [quiz_id, name, image_url || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, quiz_id, name, image_url });
  });
});

// Update an existing category
router.put('/:id', (req, res) => {
  const { name, image_url } = req.body;
  db.run('UPDATE categories SET name = ?, image_url = ? WHERE id = ?', [name, image_url || null, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;

// backend/routes/fullQuiz.js
const express = require('express');
const db = require('../db.js');
const router = express.Router();

// Get full quiz info including categories and questions
router.get('/:id/full', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM quizzes WHERE id = ?', [id], (err, quiz) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    db.all('SELECT * FROM categories WHERE quiz_id = ?', [id], (err, categories) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all('SELECT * FROM questions WHERE quiz_id = ?', [id], (err, questions) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!questions.length) {
          // No questions, return as before
          return res.json({ quiz, categories, questions: [] });
        }
        // Get all answers for these questions
        const questionIds = questions.map(q => q.id);
        const placeholders = questionIds.map(() => '?').join(',');
        db.all(`SELECT * FROM answers WHERE question_id IN (${placeholders})`, questionIds, (err, answers) => {
          if (err) return res.status(500).json({ error: err.message });
          // Attach answers to their questions
          const questionsWithAnswers = questions.map(q => ({
            ...q,
            answers: answers.filter(a => a.question_id === q.id)
          }));
          // Attach questions to their categories
          const categoriesWithQuestions = categories.map(cat => ({
            ...cat,
            questions: questionsWithAnswers.filter(q => q.category_id === cat.id)
          }));
          res.json({ quiz, categories: categoriesWithQuestions });
        });
      });
    });
  });
});

module.exports = router;

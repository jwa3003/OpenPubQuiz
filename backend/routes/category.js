// backend/routes/category.js

const express = require('express');
const { getCategoriesByQuiz, createCategory, deleteCategory, updateCategory } = require('../controllers/categoryController.js');

const router = express.Router();

// Get all categories for a quiz
router.get('/:quizId', getCategoriesByQuiz);
// Create a new category for a quiz
router.post('/', createCategory);
// Update a category
router.put('/:id', updateCategory);
// Delete a category
router.delete('/:id', deleteCategory);

module.exports = router;

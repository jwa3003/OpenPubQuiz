// backend/routes/category.js
import express from 'express';
import {
  getCategoriesByQuiz,
  createCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();

// Get all categories for a quiz
router.get('/:quizId', getCategoriesByQuiz);

// Create a new category for a quiz
router.post('/', createCategory);

// Delete a category
router.delete('/:id', deleteCategory);

export default router;

// backend/routes/doubleCategory.js
import express from 'express';
import { setDoubleCategory, getDoubleCategory } from '../controllers/doubleCategoryController.js';

const router = express.Router();

router.post('/', setDoubleCategory);
router.get('/', getDoubleCategory);

export default router;

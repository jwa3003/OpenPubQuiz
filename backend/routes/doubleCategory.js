// backend/routes/doubleCategory.js
const express = require('express');
const { setDoubleCategory, getDoubleCategory } = require('../controllers/doubleCategoryController.js');

const router = express.Router();

router.post('/', setDoubleCategory);
router.get('/', getDoubleCategory);

module.exports = router;

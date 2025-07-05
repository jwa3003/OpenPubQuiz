// backend/routes/doubleCategoryStatus.js
const express = require('express');
const { getDoubleCategoryStatus } = require('../controllers/doubleCategoryStatusController.js');

const router = express.Router();

// GET /api/double-category/status?session_id=...
router.get('/status', getDoubleCategoryStatus);

module.exports = router;

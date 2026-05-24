const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer');

// Middlewares
const requireAuth = require('../middleware/requireAuth');
const validateInput = require('../middleware/validateInput');

// Protected endpoints mapping
router.post('/transfer', requireAuth, validateInput, transferController.executeTransfer);
router.get('/history', requireAuth, transferController.getHistory);

module.exports = router;
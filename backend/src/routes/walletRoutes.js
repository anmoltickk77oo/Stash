const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transfer');

// Middlewares
const requireAuth = require('../middleware/requireAuth');
const validateInput = require('../middleware/validateInput');

// Protected endpoints mapping
router.post('/transfer', requireAuth, validateInput, transferController.executeTransfer);
router.get('/history', requireAuth, transferController.getHistory);
router.get('/balance', requireAuth, transferController.getBalance);
router.get('/verify-ledger', requireAuth, transferController.verifyLedger);
router.post('/faucet', requireAuth, transferController.executeFaucet);

module.exports = router;
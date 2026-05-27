const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

const requireAuth = require('../middleware/requireAuth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/search-users', requireAuth, authController.searchUsers);

module.exports = router;
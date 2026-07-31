const express = require('express');
const router = express.Router();
const fixedController = require('../controllers/fixedController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/', isAuthenticated, fixedController.getFixedExpenses);
router.post('/add', isAuthenticated, fixedController.addFixedExpense);
router.post('/delete/:id', isAuthenticated, fixedController.deleteFixedExpense);

module.exports = router;
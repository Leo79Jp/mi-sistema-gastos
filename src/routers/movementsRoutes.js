const express = require('express');
const router = express.Router();
const movementsController = require('../controllers/movementsController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/', isAuthenticated, movementsController.getMovementsPage);
router.post('/add', isAuthenticated, movementsController.addMovement);
router.post('/pay/:id', isAuthenticated, movementsController.payPendingMovement);
router.post('/delete/:id', isAuthenticated, movementsController.deleteMovement);

module.exports = router;
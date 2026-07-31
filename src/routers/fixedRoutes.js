const express = require('express');
const router = express.Router();
const fixedController = require('../controllers/fixedController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/', isAuthenticated, fixedController.getFixedExpenses);
router.post('/add', isAuthenticated, fixedController.addFixedExpense);

// 🔄 NUEVA RUTA PARA GENERAR LOS GASTOS DEL MES (Va antes de /delete/:id)
router.post('/generate', isAuthenticated, fixedController.generateMonthlyExpenses);

router.post('/delete/:id', isAuthenticated, fixedController.deleteFixedExpense);

module.exports = router;
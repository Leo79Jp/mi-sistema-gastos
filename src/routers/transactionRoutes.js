const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Ruta principal del dashboard
router.get('/', transactionController.getDashboard);

// Ruta para agregar nueva transacción (variable o fija desde la lista)
router.post('/add', transactionController.addTransaction);

// Ruta para marcar un gasto/ingreso fijo pendiente como pagado/cobrado
router.post('/pay/:id', transactionController.payPending);

// Ruta para eliminar una transacción
router.post('/delete/:id', transactionController.deleteTransaction);

module.exports = router;
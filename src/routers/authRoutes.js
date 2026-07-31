const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas GET (mostrar formularios)
router.get('/login', authController.getLogin);
router.get('/register', authController.getRegister);

// Rutas POST (procesar datos de formularios)
router.post('/login', authController.postLogin);
router.post('/register', authController.postRegister);

// Ruta para salir
router.get('/logout', authController.logout);

module.exports = router;
const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ... (arriba de todo junto a tus otras importaciones)
const authRoutes = require('./src/routers/authRoutes');
// Importar rutas de transacciones
const transactionRoutes = require('./src/routers/transactionRoutes');
// Importar rutas de gestión de gastos fijos
const fixedRoutes = require('./src/routers/fixedRoutes');


// Configurar motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares para leer datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos (CSS, JS del cliente)
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: false, // Cambiar a true si usas HTTPS en producción
      maxAge: 1000 * 60 * 60 * 24 // Duración de la sesión: 1 día
    }
  })
);

// Ruta de prueba temporal
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando y listo para las vistas EJS!');
});
// ... (más abajo, junto a los middlewares)
app.use('/auth', authRoutes);
// Usar rutas (puedes ponerlo que responda en /dashboard)
app.use('/dashboard', transactionRoutes);
// Usar rutas (puedes ponerlo que responda en /fixed-expenses)
app.use('/fixed-expenses', fixedRoutes);


// Redirigir la raíz '/' al dashboard (si está logueado) o al login
app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});


// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Servidor corriendo en http://localhost:${PORT}/auth/register`);
  console.log(`Servidor corriendo en http://localhost:${PORT}/auth/login`);
});
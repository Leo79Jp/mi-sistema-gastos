const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const pool = require('./src/config/db'); // Tu archivo de conexión a la BD
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ... (arriba de todo junto a tus otras importaciones)
const authRoutes = require('./src/routers/authRoutes');
// Importar rutas de transacciones
const transactionRoutes = require('./src/routers/transactionRoutes');
// Importar rutas de gestión de gastos fijos
const fixedRoutes = require('./src/routers/fixedRoutes');
// Arriba con tus otras importaciones de rutas
const movementsRoutes = require('./src/routers/movementsRoutes');

// Configurar motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares para leer datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Archivos estáticos (CSS, JS del cliente)
app.use(express.static(path.join(__dirname, 'public')));

// NECESARIO en Vercel para que reconozca las cookies seguras tras el proxy
app.set('trust proxy', 1);

// Configuración de sesiones persistente
app.use(
  session({
    store: new pgSession({
      pool: pool,                // Conexión a tu base de datos PostgreSQL
      tableName: 'session',      // Nombre de la tabla donde se guardarán las sesiones
      createTableIfMissing: true // Crea la tabla automáticamente si no existe
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // true en Vercel (porque usa HTTPS)
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
  })
);


// ... (más abajo, junto a los middlewares)
app.use('/auth', authRoutes);
// Usar rutas (puedes ponerlo que responda en /dashboard)
app.use('/dashboard', transactionRoutes);
// Usar rutas (puedes ponerlo que responda en /fixed-expenses)
app.use('/fixed-expenses', fixedRoutes);
// Más abajo, donde configuras las rutas de la app:
app.use('/movements', movementsRoutes);

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
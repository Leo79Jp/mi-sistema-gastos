const pool = require('../config/db');
const bcrypt = require('bcrypt');

// Mostrar vista de Login
// exports.getLogin = (req, res) => {
//   res.render('auth/login', { error: null });
// };
exports.getLogin = (req, res) => {
    // Verificamos si estamos en local y si existen las variables en el .env
    const isLocal = process.env.NODE_ENV !== 'production'; // O puedes usar una variable propia
    
    res.render('auth/login', {
        defaultEmail: (isLocal && process.env.DEV_EMAIL) ? process.env.DEV_EMAIL : '',
        defaultPassword: (isLocal && process.env.DEV_PASSWORD) ? process.env.DEV_PASSWORD : ''
    });
};
// Mostrar vista de Registro
exports.getRegister = (req, res) => {
  res.render('auth/register', { error: null });
};

// Procesar el Registro
exports.postRegister = async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Verificar si el usuario ya existe
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.render('auth/register', { error: 'El correo ya está registrado.' });
    }

    // 2. Hashear la contraseña de forma segura
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Guardar el nuevo usuario en la base de datos
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [email, hashedPassword]
    );

    // 4. Redirigir al login tras un registro exitoso
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    res.render('auth/register', { error: 'Ocurrió un error en el servidor.' });
  }
};

// Procesar el Login
exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // 1. Buscar al usuario por su email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.render('auth/login', { error: 'Correo o contraseña incorrectos.' });
    }

    const user = result.rows[0];

    // 2. Comparar la contraseña ingresada con la hasheada en la base de datos
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('auth/login', { error: 'Correo o contraseña incorrectos.' });
    }

    // 3. Crear la sesión del usuario
    req.session.userId = user.id;
    req.session.email = user.email;

    // 4. Redirigir al dashboard principal
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.render('auth/login', { error: 'Ocurrió un error en el servidor.' });
  }
};

// Cerrar sesión
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
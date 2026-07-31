const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next(); // Si hay sesión, déjalo pasar
  }
  // Si no está logueado, redirigir al login
  res.redirect('/auth/login');
};

module.exports = { isAuthenticated };
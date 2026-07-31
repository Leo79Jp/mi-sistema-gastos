const pool = require('../config/db');

// Mostrar la vista de gestión de gastos fijos
exports.getFixedExpenses = async (req, res) => {
  const userId = req.session.userId;
  try {
    const result = await pool.query(
      'SELECT * FROM fixed_expenses WHERE user_id = $1 ORDER BY due_day ASC',
      [userId]
    );
    res.render('fixed-expenses', { 
      email: req.session.email, 
      fixedExpenses: result.rows,
      error: null,
      success: null
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar los gastos fijos');
  }
};

// Agregar un nuevo gasto fijo a la plantilla
exports.addFixedExpense = async (req, res) => {
  const userId = req.session.userId;
  const { title, amount, due_day, type } = req.body;

  // Si 'amount' está vacío, lo convertimos a null para que PostgreSQL lo acepte
  const parsedAmount = (amount && amount.trim() !== '') ? parseFloat(amount) : null;

  try {
    await pool.query(
      'INSERT INTO fixed_expenses (user_id, title, amount, due_day, type) VALUES ($1, $2, $3, $4, $5)',
      [userId, title, parsedAmount, due_day, type || 'expense']
    );
    res.redirect('/fixed-expenses');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al agregar el movimiento fijo');
  }
};

// Eliminar un gasto fijo de la plantilla
exports.deleteFixedExpense = async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM fixed_expenses WHERE id = $1 AND user_id = $2', [id, userId]);
    res.redirect('/fixed-expenses');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar el gasto fijo');
  }
};
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

// Generar los movimientos fijos en la tabla de transacciones para el mes actual
exports.generateMonthlyExpenses = async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect('/auth/login');
  }

  try {
    // 1. Obtener la fecha actual (Año y Mes)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthPrefix = `${year}-${month}`;

    // 2. Traer todos los gastos/ingresos fijos de la plantilla del usuario
    const fixedResult = await pool.query(
      'SELECT * FROM fixed_expenses WHERE user_id = $1',
      [userId]
    );
    const fixedExpenses = fixedResult.rows;

    if (fixedExpenses.length === 0) {
      return res.redirect('/fixed-expenses');
    }

    // 3. Iterar sobre cada elemento para insertarlo si no existe este mes
    for (const item of fixedExpenses) {
      const dayFormatted = String(item.due_day).padStart(2, '0');
      const dueDate = `${currentMonthPrefix}-${dayFormatted}`;

      // Verificar si ya existe una transacción con este título para este usuario en este mes
      const checkQuery = `
        SELECT id FROM transactions 
        WHERE user_id = $1 
          AND title = $2 
          AND TO_CHAR(date, 'YYYY-MM') = $3
      `;
      const checkResult = await pool.query(checkQuery, [userId, item.title, currentMonthPrefix]);

      // Si no existe, lo insertamos en transacciones como pendiente
      if (checkResult.rows.length === 0) {
        const insertQuery = `
          INSERT INTO transactions (user_id, title, amount, type, is_fixed, status, due_date, date)
          VALUES ($1, $2, $3, $4, true, 'pending', $5, $6)
        `;
        await pool.query(insertQuery, [
          userId, 
          item.title, 
          item.amount, 
          item.type || 'expense', 
          dueDate, 
          dueDate
        ]);
      }
    }

    res.redirect('/fixed-expenses');

  } catch (error) {
    console.error('Error al generar los gastos mensuales:', error);
    res.status(500).send('Error interno del servidor al generar los fijos');
  }
};
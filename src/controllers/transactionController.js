const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  const userId = req.session.userId;
  
  const currentDate = new Date();
  const year = req.query.year || currentDate.getFullYear();
  const month = req.query.month || (currentDate.getMonth() + 1);

  try {
    // --- AUTOMATIZACIÓN DE GASTOS E INGRESOS FIJOS ---
    const fixedTemplates = await pool.query('SELECT * FROM fixed_expenses WHERE user_id = $1', [userId]);

    if (fixedTemplates.rows.length > 0) {
      for (const fixed of fixedTemplates.rows) {
        const checkExisting = await pool.query(`
          SELECT * FROM transactions 
          WHERE user_id = $1 
            AND title = $2 
            AND is_fixed = true 
            AND EXTRACT(MONTH FROM date) = $3 
            AND EXTRACT(YEAR FROM date) = $4
        `, [userId, fixed.title, month, year]);

        if (checkExisting.rows.length === 0) {
                  const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(fixed.due_day || 1).padStart(2, '0')}`;
                  
                  // Si el fijo no tiene monto definido, guardamos 0 o null temporalmente para evitar el error
                  const defaultAmount = fixed.amount !== null && fixed.amount !== undefined ? fixed.amount : 0;

                  await pool.query(`
                    INSERT INTO transactions (user_id, title, amount, type, is_fixed, status, due_date, date)
                    VALUES ($1, $2, $3, $4, true, 'pending', $5, $6)
                  `, [userId, fixed.title, defaultAmount, fixed.type || 'expense', dueDate, dueDate]);
        }
      }
    }

    // 1. Obtener pendientes del mes actual
    const pendingQuery = `
      SELECT * FROM transactions 
      WHERE user_id = $1 AND is_fixed = true AND status = 'pending' 
        AND EXTRACT(MONTH FROM date) = $2 
        AND EXTRACT(YEAR FROM date) = $3
      ORDER BY due_date ASC;
    `;
    const pendingResult = await pool.query(pendingQuery, [userId, month, year]);

    // 2. Obtener lista de plantillas fijas para el menú desplegable
    const fixedTemplatesResult = await pool.query(
      'SELECT * FROM fixed_expenses WHERE user_id = $1 ORDER BY title ASC',
      [userId]
    );

    // 3. Obtener transacciones del mes y año seleccionado
    const transactionsQuery = `
      SELECT * FROM transactions 
      WHERE user_id = $1 
        AND EXTRACT(MONTH FROM date) = $2 
        AND EXTRACT(YEAR FROM date) = $3
      ORDER BY date DESC;
    `;
    const transactionsResult = await pool.query(transactionsQuery, [userId, month, year]);

// 4. Calcular totales de forma segura (evitando NaN si algún monto es null)
    let totalIncome = 0;
    let totalExpense = 0;

    transactionsResult.rows.forEach(t => {
      const amount = parseFloat(t.amount);
      // Verificamos que el monto sea un número válido antes de sumar
      if (!isNaN(amount)) {
        if (t.type === 'income') {
          totalIncome += amount;
        } else if (t.type === 'expense') {
          totalExpense += amount;
        }
      }
    });

    const balance = totalIncome - totalExpense;

    // 5. Datos para el Gráfico (Últimos 6 meses)
    const chartQuery = `
      SELECT 
        EXTRACT(YEAR FROM date) as yr,
        EXTRACT(MONTH FROM date) as mo,
        type,
        SUM(amount) as total
      FROM transactions
      WHERE user_id = $1
        AND date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY yr, mo, type
      ORDER BY yr ASC, mo ASC;
    `;
    const chartResult = await pool.query(chartQuery, [userId]);
    
    const monthNames = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const chartDataMap = {};

    chartResult.rows.forEach(row => {
      const key = `${monthNames[parseInt(row.mo)]} ${row.yr}`;
      if (!chartDataMap[key]) {
        chartDataMap[key] = { income: 0, expense: 0 };
      }
      if (row.type === 'income') {
        chartDataMap[key].income = parseFloat(row.total);
      } else if (row.type === 'expense') {
        chartDataMap[key].expense = parseFloat(row.total);
      }
    });

    const chartLabels = Object.keys(chartDataMap);
    const chartIncomes = chartLabels.map(label => chartDataMap[label].income);
    const chartExpenses = chartLabels.map(label => chartDataMap[label].expense);

    res.render('dashboard', {
      email: req.session.email,
      pendingExpenses: pendingResult.rows,
      transactions: transactionsResult.rows,
      fixedTemplates: fixedTemplatesResult.rows,
      totals: { totalIncome, totalExpense, balance },
      filters: { month, year },
      chart: {
        labels: chartLabels,
        incomes: chartIncomes,
        expenses: chartExpenses
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al cargar el dashboard');
  }
};

exports.addTransaction = async (req, res) => {
  const userId = req.session.userId;
  const title = req.body.fixed_template_title || req.body.title;
  const { amount, type, is_fixed, due_date, date } = req.body;

  try {
    const isFixedBoolean = is_fixed === 'on' || is_fixed === true;
    
    // CAMBIO AQUÍ: Usamos 'paid' en lugar de 'completed' para respetar la regla de la base de datos
    const status = isFixedBoolean ? 'paid' : 'paid'; 
    
    const cleanAmount = amount ? Math.round(parseFloat(amount)) : null;

    await pool.query(`
      INSERT INTO transactions (user_id, title, amount, type, is_fixed, status, due_date, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, title, cleanAmount, type, isFixedBoolean, status, due_date || null, date || new Date()]);

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al agregar la transacción');
  }
};


exports.payPending = async (req, res) => {
  const userId = req.session.userId;
  const transactionId = req.params.id;
  const { amount } = req.body; 

  try {
    // Redondeamos el monto a entero
    const cleanAmount = amount ? Math.round(parseFloat(amount)) : 0;

    await pool.query(
      "UPDATE transactions SET status = 'paid', amount = $1 WHERE id = $2 AND user_id = $3",
      [cleanAmount, transactionId, userId]
    );
    res.redirect('/dashboard');
  } catch (error) { console.error(error);
    res.status(500).send('Error al actualizar el pago');
 }
};

exports.deleteTransaction = async (req, res) => {
  const userId = req.session.userId;
  const transactionId = req.params.id;

  try {
    await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId]
    );
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al eliminar la transacción');
  }
};


const pool = require('../config/db');
exports.getMovementsPage = async (req, res) => {
    const userId = req.session.userId;
    const currentDate = new Date();
    const year = req.query.year || currentDate.getFullYear();
    const month = req.query.month || (currentDate.getMonth() + 1);

    try {
        // 1. Obtener pendientes del mes
        const pendingQuery = `
            SELECT * FROM transactions 
            WHERE user_id = $1 AND is_fixed = true AND status = 'pending' 
                AND EXTRACT(MONTH FROM date) = $2 
                AND EXTRACT(YEAR FROM date) = $3
            ORDER BY due_date ASC;
        `;
        const pendingResult = await pool.query(pendingQuery, [userId, month, year]);

        // 2. Obtener lista de plantillas fijas para el selector
        const fixedTemplatesResult = await pool.query(
            'SELECT * FROM fixed_expenses WHERE user_id = $1 ORDER BY title ASC',
            [userId]
        );

// 3. Obtener transacciones del mes: 
        // - Solo del mes y año seleccionados ($2 y $3)
        // - Que NO estén pendientes (status = 'paid' o el estado que uses al pagar), 
        //   para que los pendientes se queden únicamente en su sección de arriba.
        const transactionsQuery = `
            SELECT * FROM transactions 
            WHERE user_id = $1 
                AND status = 'paid'
                AND EXTRACT(MONTH FROM date) = $2 
                AND EXTRACT(YEAR FROM date) = $3
            ORDER BY date DESC, id DESC;
        `;
        const transactionsResult = await pool.query(transactionsQuery, [userId, month, year]);
        
        res.render('movements', {
            email: req.session.email,
            pendingExpenses: pendingResult.rows,
            transactions: transactionsResult.rows,
            fixedTemplates: fixedTemplatesResult.rows,
            filters: { month, year }
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar la página de movimientos');
    }
};

exports.addMovement = async (req, res) => {
    const userId = req.session.userId;
    const title = req.body.fixed_template_title || req.body.title;
    const { amount, type, is_fixed, due_date, date } = req.body;

    try {
        const isFixedBoolean = is_fixed === 'on' || is_fixed === true;
        const status = 'paid'; 
        const cleanAmount = amount ? Math.round(parseFloat(amount)) : null;

        await pool.query(`
            INSERT INTO transactions (user_id, title, amount, type, is_fixed, status, due_date, date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [userId, title, cleanAmount, type, isFixedBoolean, status, due_date || null, date || new Date()]);

        // Redirigimos agregando un indicador de éxito en la URL
        res.redirect('/movements?success=true');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al agregar el movimiento');
    }
};

exports.payPendingMovement = async (req, res) => {
    const userId = req.session.userId;
    const transactionId = req.params.id;
    const { amount } = req.body; 

    try {
        const cleanAmount = amount ? Math.round(parseFloat(amount)) : 0;
        await pool.query(
            "UPDATE transactions SET status = 'paid', amount = $1 WHERE id = $2 AND user_id = $3",
            [cleanAmount, transactionId, userId]
        );
        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al actualizar el pago');
    }
};

exports.deleteMovement = async (req, res) => {
    const userId = req.session.userId;
    const transactionId = req.params.id;

    try {
        await pool.query(
            'DELETE FROM transactions WHERE id = $1 AND user_id = $2',
            [transactionId, userId]
        );
        res.redirect('/movements');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al eliminar el movimiento');
    }
};
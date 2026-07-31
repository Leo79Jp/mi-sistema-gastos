const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Si usas proveedores cloud como Supabase o Neon, a veces requieren SSL:
  // ssl: { rejectUnauthorized: false } 
});

pool.on('connect', () => {
  console.log('Base de datos conectada exitosamente');
});

module.exports = pool;
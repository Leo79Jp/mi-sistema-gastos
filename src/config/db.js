const { Pool } = require('pg');
require('dotenv').config();

// Si estamos en producción (Vercel), activamos SSL; si estamos en local, no.
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

module.exports = pool;
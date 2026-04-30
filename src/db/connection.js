// src/db/connection.js
const { Pool } = require('pg');

// Aquí pegas tu Connection String de Neon
const connectionString = process.env.DATABASE_URL; 

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } // Requerido para Neon
});

const initDB = async () => {
    // Creamos las tablas en PostgreSQL (la sintaxis cambia ligeramente de SQLite)
    const query = `
        CREATE TABLE IF NOT EXISTS usuarios (
            telegram_id TEXT PRIMARY KEY,
            nombre TEXT,
            rol TEXT DEFAULT 'CLIENTE'
        );

        CREATE TABLE IF NOT EXISTS barberos (
            id SERIAL PRIMARY KEY,
            nombre TEXT
        );

        CREATE TABLE IF NOT EXISTS servicios (
            id SERIAL PRIMARY KEY,
            nombre TEXT,
            precio REAL
        );

        CREATE TABLE IF NOT EXISTS turnos (
            id SERIAL PRIMARY KEY,
            barbero_id INTEGER,
            servicio_id INTEGER,
            fecha TEXT,
            propina REAL DEFAULT 0,
            FOREIGN KEY (barbero_id) REFERENCES barberos(id),
            FOREIGN KEY (servicio_id) REFERENCES servicios(id)
        );
    `;
    
    try {
        await pool.query(query);
        
        // Insertamos datos iniciales solo si la tabla está vacía
        const res = await pool.query('SELECT COUNT(*) FROM barberos');
        if (parseInt(res.rows[0].count) === 0) {
            await pool.query("INSERT INTO barberos (nombre) VALUES ('Marcos'), ('Julian')");
            await pool.query("INSERT INTO servicios (nombre, precio) VALUES ('Corte Clásico', 2000), ('Corte y Barba', 3000), ('Coloración', 5000)");
            console.log("✅ Datos maestros insertados en Neon.");
        }
    } catch (err) {
        console.error("❌ Error al inicializar Neon:", err);
    }
};

const executeQuery = async (text, params) => {
    const res = await pool.query(text, params);
    return res.rows; // PostgreSQL devuelve los resultados en .rows
};

module.exports = { initDB, executeQuery };
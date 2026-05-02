// src/db/connection.js
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL; 

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } 
});

const initDB = async () => {
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
            hora TEXT,
            propina REAL DEFAULT 0,
            FOREIGN KEY (barbero_id) REFERENCES barberos(id),
            FOREIGN KEY (servicio_id) REFERENCES servicios(id)
        );
    `;
    
    try {
        await pool.query(query);
        
        // --- SCRIPT DE MIGRACIÓN PARA AGREGAR LA COLUMNA FALTANTE ---
        try {
            await pool.query('ALTER TABLE turnos ADD COLUMN IF NOT EXISTS hora TEXT;');
            console.log("✅ Migración exitosa: Columna 'hora' verificada en la base de datos.");
        } catch (alterError) {
            console.log("⚠️ Nota: La columna hora ya estaba procesada o hubo un tema menor:", alterError.message);
        }
        // -------------------------------------------------------------

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

// Adaptamos executeQuery para aceptar un array de parámetros
const executeQuery = async (text, params = []) => {
    const res = await pool.query(text, params);
    return res.rows; 
};

module.exports = { initDB, executeQuery };
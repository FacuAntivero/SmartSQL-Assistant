// src/db/connection.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 1. Guardamos en un archivo físico en lugar de RAM
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const initDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 2. Crear tablas SOLO si no existen
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (telegram_id TEXT PRIMARY KEY, nombre TEXT, rol TEXT)`);
      db.run(`CREATE TABLE IF NOT EXISTS barberos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, porcentaje_comision INTEGER)`);
      db.run(`CREATE TABLE IF NOT EXISTS servicios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL)`);
      db.run(`CREATE TABLE IF NOT EXISTS turnos (id INTEGER PRIMARY KEY AUTOINCREMENT, barbero_id INTEGER, servicio_id INTEGER, fecha TEXT, propina REAL)`);

      // 3. Comprobar si la base de datos está vacía antes de insertar la data inicial
      db.get(`SELECT COUNT(*) as count FROM barberos`, (err, row) => {
        if (err) reject(err);
        
        if (row && row.count === 0) {
          console.log("🌱 Insertando datos de prueba iniciales...");
          
          const todayObj = new Date();
          const today = todayObj.toISOString().split('T')[0];
          const yesterdayObj = new Date(todayObj);
          yesterdayObj.setDate(yesterdayObj.getDate() - 1);
          const yesterday = yesterdayObj.toISOString().split('T')[0];

          db.run(`INSERT INTO barberos (nombre, porcentaje_comision) VALUES ('Marcos', 50)`);
          db.run(`INSERT INTO barberos (nombre, porcentaje_comision) VALUES ('Julian', 40)`);

          db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Corte Clásico', 15.00)`);
          db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Corte y Barba', 22.00)`);
          db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Coloración', 35.00)`);

          db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 1, '${yesterday}', 2.00)`);
          db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 2, '${yesterday}', 5.00)`);
          db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (2, 1, '${yesterday}', 0.00)`);
          db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 3, '${today}', 10.00)`);
          db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (2, 2, '${today}', 3.00)`);
        } else {
          console.log("✅ La base de datos ya contiene información, saltando mock data.");
        }
        resolve();
      });
    });
  });
};

const executeQuery = (sql) => {
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
};

// Exportamos 'db' también, lo usaremos pronto para manejar usuarios sin pasar por Gemini
module.exports = { initDB, executeQuery, db };
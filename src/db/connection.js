// src/db/connection.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

const initDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Crear tablas
      db.run(`CREATE TABLE barberos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, porcentaje_comision INTEGER)`);
      db.run(`CREATE TABLE servicios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL)`);
      db.run(`CREATE TABLE turnos (id INTEGER PRIMARY KEY AUTOINCREMENT, barbero_id INTEGER, servicio_id INTEGER, fecha TEXT, propina REAL)`);

      // 1. Insertar Barberos
      db.run(`INSERT INTO barberos (nombre, porcentaje_comision) VALUES ('Marcos', 50)`);
      db.run(`INSERT INTO barberos (nombre, porcentaje_comision) VALUES ('Julian', 40)`);

      // 2. Insertar Servicios
      db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Corte Clásico', 15.00)`);
      db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Corte y Barba', 22.00)`);
      db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Coloración', 35.00)`);

      // 3. Insertar Turnos (Fechas de Abril 2026)
      // Turnos de ayer (26 de Abril) y hoy (27 de Abril)
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 1, '2026-04-26', 2.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 2, '2026-04-26', 5.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (2, 1, '2026-04-26', 0.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 3, '2026-04-27', 10.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (2, 2, '2026-04-27', 3.00)`);

      resolve();
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

module.exports = { initDB, executeQuery };
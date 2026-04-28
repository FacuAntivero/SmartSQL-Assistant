// src/db/connection.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

const initDB = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Calcular fechas dinámicas para que la demo SIEMPRE funcione
      const todayObj = new Date();
      const today = todayObj.toISOString().split('T')[0];
      
      const yesterdayObj = new Date(todayObj);
      yesterdayObj.setDate(yesterdayObj.getDate() - 1);
      const yesterday = yesterdayObj.toISOString().split('T')[0];

      // 2. Crear tablas
      db.run(`CREATE TABLE barberos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, porcentaje_comision INTEGER)`);
      db.run(`CREATE TABLE servicios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, precio REAL)`);
      db.run(`CREATE TABLE turnos (id INTEGER PRIMARY KEY AUTOINCREMENT, barbero_id INTEGER, servicio_id INTEGER, fecha TEXT, propina REAL)`);

      // 3. Insertar Barberos
      db.run(`INSERT INTO barberos (nombre, porcentaje_comision) VALUES ('Marcos', 50)`);
      db.run(`INSERT INTO barberos (nombre, porcentaje_comision) VALUES ('Julian', 40)`);

      // 4. Insertar Servicios
      db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Corte Clásico', 15.00)`);
      db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Corte y Barba', 22.00)`);
      db.run(`INSERT INTO servicios (nombre, precio) VALUES ('Coloración', 35.00)`);

      // 5. Insertar Turnos usando las fechas dinámicas
      // Turnos de AYER
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 1, '${yesterday}', 2.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 2, '${yesterday}', 5.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (2, 1, '${yesterday}', 0.00)`);
      
      // Turnos de HOY
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (1, 3, '${today}', 10.00)`);
      db.run(`INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (2, 2, '${today}', 3.00)`);

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
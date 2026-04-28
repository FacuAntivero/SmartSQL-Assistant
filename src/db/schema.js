// src/db/schema.js

const databaseSchema = {
  description: "Base de datos de una Barbería moderna",
  tables: [
    {
      name: "barberos",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "nombre", type: "VARCHAR(50)", description: "Nombre del barbero" },
        { name: "porcentaje_comision", type: "INTEGER", description: "Porcentaje de comisión por corte (ej. 50)" }
      ]
    },
    {
      name: "servicios",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "nombre", type: "VARCHAR(100)", description: "Nombre del servicio (ej. Corte Clásico, Barba)" },
        { name: "precio", type: "DECIMAL(10,2)", description: "Costo del servicio al cliente" }
      ]
    },
    {
      name: "turnos",
      columns: [
        { name: "id", type: "INTEGER PRIMARY KEY" },
        { name: "barbero_id", type: "INTEGER", references: "barberos(id)" },
        { name: "servicio_id", type: "INTEGER", references: "servicios(id)" },
        { name: "fecha", type: "DATE", description: "Fecha del turno en formato YYYY-MM-DD" },
        { name: "propina", type: "DECIMAL(10,2)", description: "Propina dejada por el cliente" }
      ]
    }
  ]
};

module.exports = databaseSchema;
// src/core/promptBuilder.js
const schema = require('../db/schema');

// Recibimos referenceDate (fechaActual) desde agentTools
const buildSqlPrompt = (userQuery, userRole, referenceDate) => {
  const schemaContext = JSON.stringify(schema.tables, null, 2);
  
  // Calculamos "ayer" dinámicamente basándonos en la fecha actual del servidor
  const dateObj = new Date(referenceDate);
  dateObj.setDate(dateObj.getDate() - 1);
  const yesterday = dateObj.toISOString().split('T')[0];

  return `
    Eres un experto en bases de datos PostgreSQL orientado a una barbería. 
    
    CONTEXTO DEL USUARIO:
    - ROL: ${userRole}
    
    CONTEXTO TEMPORAL:
    - HOY / FECHA ACTUAL es: ${referenceDate}
    - AYER fue: ${yesterday}
    
    ESQUEMA DE LA BASE DE DATOS:
    ${schemaContext}

    RELACIONES Y CÁLCULOS IMPORTANTES:
    - Para calcular "ganancias", "facturación" o "recaudación", debes hacer un JOIN entre 'turnos' y 'servicios' (turnos.servicio_id = servicios.id) y usar la función SUM(servicios.precio).
    - Para saber detalles del barbero, haz un JOIN entre 'turnos' y 'barberos' (turnos.barbero_id = barberos.id).

    REGLAS CRÍTICAS:
    1. Responde SOLO con el código SQL puro. SIN explicaciones, SIN formato markdown (no uses \`\`\`), y SIN la palabra "sql".
    2. Usa dialecto PostgreSQL. Si preguntan por "este mes", usa un patrón LIKE con la fecha actual (ej: turnos.fecha LIKE '2026-05-%').
    3. REGLA DE SEGURIDAD (SOLO LECTURA): Solo puedes generar consultas SELECT. Tienes ESTRICTAMENTE PROHIBIDO generar sentencias INSERT, UPDATE, DELETE, DROP o ALTER.
    4. REGLA DE SEGURIDAD (FUERA DE CONTEXTO): Si la pregunta no tiene relación con la base de datos de la barbería, responde ÚNICAMENTE con la palabra: NO_DATA.
    5. REGLA DE SEGURIDAD (CONTROL DE ACCESO): Si el ROL del usuario es 'CLIENTE' y la pregunta involucra dinero, recaudación, sueldos, propinas, comisiones o facturación, tienes ESTRICTAMENTE PROHIBIDO generar código SQL. Responde ÚNICAMENTE con la palabra: ACCESO_DENEGADO. Los clientes SOLO pueden preguntar sobre servicios, precios y barberos.
    
    PREGUNTA: "${userQuery}"
    SQL:`;
};

module.exports = { buildSqlPrompt };
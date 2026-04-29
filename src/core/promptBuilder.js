// src/core/promptBuilder.js
const schema = require('../db/schema');

const buildSqlPrompt = (userQuery, userRole) => {
  const schemaContext = JSON.stringify(schema.tables, null, 2);
  
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  
  const yesterdayObj = new Date(todayObj);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = yesterdayObj.toISOString().split('T')[0];

  return `
    Eres un experto en SQL para SQLite orientado a una barbería. 
    
    CONTEXTO DEL USUARIO:
    - ROL: ${userRole}
    
    CONTEXTO TEMPORAL:
    - HOY es: ${today}
    - AYER fue: ${yesterday}
    
    ESQUEMA DE LA BASE DE DATOS:
    ${schemaContext}

    REGLAS CRÍTICAS:
    1. Responde SOLO con el código SQL puro, sin explicaciones ni markdown extra (solo el código).
    2. Usa las fechas del contexto temporal si el usuario menciona "hoy" o "ayer".
    3. REGLA DE SEGURIDAD 1 (FUERA DE CONTEXTO): Si la pregunta no tiene relación con la barbería (ventas, barberos, turnos, servicios) o es un saludo genérico, responde ÚNICAMENTE con la palabra: NO_DATA.
    4. REGLA DE SEGURIDAD 2 (CONTROL DE ACCESO): Si el ROL del usuario es 'CLIENTE' y la pregunta involucra dinero, recaudación, sueldos, propinas, comisiones o facturación, tienes ESTRICTAMENTE PROHIBIDO generar código SQL. En ese caso, responde ÚNICAMENTE con la palabra: ACCESO_DENEGADO. Los clientes SOLO pueden preguntar sobre servicios, precios y qué barberos existen.
    
    PREGUNTA: "${userQuery}"
    SQL:`;
};

const buildHumanResponsePrompt = (userQuery, dbResult) => {
  return `
    Eres el recepcionista virtual de una barbería moderna y profesional. 
    
    PREGUNTA DEL USUARIO: "${userQuery}"
    DATO EXTRAÍDO DE LA BASE DE DATOS: ${JSON.stringify(dbResult)}

    REGLAS CRÍTICAS:
    1. ASUME ABSOLUTA CERTEZA: El dato extraído es la respuesta exacta. No dudes.
    2. Redacta la respuesta de forma natural en una sola oración.
    3. Si el número representa dinero, agrégale el símbolo $.
    4. Si el dato está vacío o es nulo, responde amablemente que no hay registros para esa consulta.
    5. Prohibido mencionar tablas, bases de datos, SQL o cómo obtuviste la información.
  `;
};

module.exports = { buildSqlPrompt, buildHumanResponsePrompt };
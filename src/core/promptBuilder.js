// src/core/promptBuilder.js
const schema = require('../db/schema');

const buildSqlPrompt = (userQuery) => {
  const schemaContext = JSON.stringify(schema.tables, null, 2);
  
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  
  const yesterdayObj = new Date(todayObj);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = yesterdayObj.toISOString().split('T')[0];

  return `
    Eres un experto en SQL para SQLite orientado a una barbería. 
    
    CONTEXTO TEMPORAL:
    - HOY es: ${today}
    - AYER fue: ${yesterday}
    
    ESQUEMA DE LA BASE DE DATOS:
    ${schemaContext}

    REGLAS:
    1. Responde SOLO con el código SQL puro.
    2. Usa las fechas del contexto temporal si el usuario menciona "hoy" o "ayer".
    3. REGLA DE SEGURIDAD: Si la pregunta no tiene relación con la barbería (ventas, barberos, turnos) o es un saludo genérico (como "hola"), responde ÚNICAMENTE con la palabra: NO_DATA.
    
    PREGUNTA: "${userQuery}"
    SQL:`;
};

const buildHumanResponsePrompt = (userQuery, dbResult) => {
  return `
    Eres el gerente de una barbería moderna y profesional. 
    
    PREGUNTA DEL DUEÑO: "${userQuery}"
    DATO EXTRAÍDO DE LA BASE DE DATOS: ${JSON.stringify(dbResult)}

    REGLAS CRÍTICAS:
    1. ASUME ABSOLUTA CERTEZA: El dato extraído es la respuesta exacta.
    2. Redacta la respuesta en una sola oración.
    3. Si el número representa dinero, agrégale el símbolo $.
    4. Si el dato está vacío o es nulo, responde amablemente que no hay registros de eso.
    5. Prohibido mencionar tablas o SQL.
  `;
};

module.exports = { buildSqlPrompt, buildHumanResponsePrompt };
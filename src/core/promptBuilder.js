// src/core/promptBuilder.js
const schema = require('../db/schema');

const buildSqlPrompt = (userQuery) => {
  const schemaContext = JSON.stringify(schema.tables, null, 2);
  
  // Le calculamos las fechas exactas con JavaScript para evitar errores de la IA
  const todayObj = new Date();
  const today = todayObj.toISOString().split('T')[0];
  
  const yesterdayObj = new Date(todayObj);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterday = yesterdayObj.toISOString().split('T')[0];

  return `
    Eres un experto en SQL para SQLite. 
    
    CONTEXTO TEMPORAL:
    - HOY es: ${today}
    - AYER fue: ${yesterday}
    
    ESQUEMA DE LA BASE DE DATOS:
    ${schemaContext}

    REGLAS:
    1. Responde SOLO con el código SQL puro.
    2. Usa las fechas del contexto temporal si el usuario menciona "hoy" o "ayer".
    
    PREGUNTA: "${userQuery}"
    SQL:`;
};

const buildHumanResponsePrompt = (userQuery, dbResult) => {
  return `
    Eres el gerente de una barbería moderna y profesional. 
    
    PREGUNTA DEL DUEÑO: "${userQuery}"
    DATO EXTRAÍDO DE LA BASE DE DATOS: ${JSON.stringify(dbResult)}

    REGLAS CRÍTICAS:
    1. ASUME ABSOLUTA CERTEZA: El dato extraído es la respuesta exacta a la pregunta. No dudes ni digas "parece que" o "solo veo".
    2. Redacta la respuesta en una sola oración.
    3. Si el número representa dinero (facturación, propinas, precio), agrégale el símbolo $.
    4. Prohibido mencionar tablas, SQL o bases de datos.
  `;
};

module.exports = { buildSqlPrompt, buildHumanResponsePrompt };
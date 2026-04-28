// index.js
require('dotenv').config();
const readline = require('readline');
const model = require('./src/config/gemini'); 
const { buildSqlPrompt, buildHumanResponsePrompt } = require('./src/core/promptBuilder');
const { initDB, executeQuery } = require('./src/db/connection');

// Configuramos la interfaz de consola
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function processQuestion(userQuery) {
  try {
    const sqlPrompt = buildSqlPrompt(userQuery);
    const resultSQL = await model.generateContent(sqlPrompt);
    let sqlQuery = resultSQL.response.text().trim().replace(/```sql/g, '').replace(/```/g, '').trim();

    if (sqlQuery.startsWith("ERROR")) {
        console.log("\n⚠️  Asistente: Lo siento, no tengo información en mi base de datos para responder a esa pregunta.");
        return;
    }

    const dbRows = await executeQuery(sqlQuery);
    
    const humanPrompt = buildHumanResponsePrompt(userQuery, dbRows);
    const resultHuman = await model.generateContent(humanPrompt);
    const finalAnswer = resultHuman.response.text().trim();

    console.log("\n=============================================");
    console.log(`🗣️  Asistente: "${finalAnswer}"`);
    console.log("=============================================\n");

  } catch (error) {
    console.error("\n❌ Error en la ejecución:", error.message);
  }
}

async function startChat() {
  rl.question('👤 Tu pregunta (o escribe "salir" para terminar): ', async (answer) => {
    if (answer.toLowerCase() === 'salir' || answer.toLowerCase() === 'exit') {
      console.log("👋 ¡Cerrando SmartSQL Assistant. Hasta luego!");
      rl.close();
      return;
    }

    await processQuestion(answer);
    
    // Volvemos a llamar a la función para hacer un bucle infinito
    startChat();
  });
}

async function main() {
  console.log("🚀 Iniciando SmartSQL Assistant...\n");
  await initDB();
  console.log("✅ Base de datos inicializada. ¡El asistente está listo!\n");
  
  startChat();
}

main();
// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const model = require('./src/config/gemini');
const { buildSqlPrompt, buildHumanResponsePrompt } = require('./src/core/promptBuilder');
const { initDB, executeQuery } = require('./src/db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- 1. Inicializar Base de Datos ---
initDB().then(() => {
    console.log("✅ Base de Datos de la Barbería lista.");
});

// --- 2. Configurar Servidor Express (Para que el hosting no se caiga) ---
app.get('/', (req, res) => {
    res.send("🤖 BarberShop AI Assistant está corriendo en vivo.");
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor web activo en el puerto ${PORT}`);
});

// --- 3. Configurar Bot de Telegram ---
const token = process.env.TELEGRAM_TOKEN;

if (!token) {
    console.error("❌ ERROR: Falta el TELEGRAM_TOKEN en el archivo .env");
    process.exit(1);
}

// Inicializamos el bot en modo "polling" (escucha constantemente)
const bot = new TelegramBot(token, { polling: true });
console.log("📲 Bot de Telegram escuchando mensajes...");

// Escuchar cualquier mensaje de texto
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const question = msg.text;

    // Si el usuario recién entra al bot
    if (question === '/start') {
        return bot.sendMessage(chatId, "💈 ¡Hola! Soy la IA de tu barbería. Pregúntame sobre ventas, turnos o barberos. Por ejemplo: '¿Cuánto facturó Marcos ayer?'");
    }

    // Le damos feedback al usuario de que estamos pensando
    bot.sendMessage(chatId, "⏳ Analizando tu consulta...");

    try {
        // Fase 1: SQL
        const sqlPrompt = buildSqlPrompt(question);
        const resultSQL = await model.generateContent(sqlPrompt);
        const sqlQuery = resultSQL.response.text().trim().replace(/```sql/g, '').replace(/```/g, '').trim();

        // Fase 2: Ejecutar en SQLite
        const data = await executeQuery(sqlQuery);

        // Fase 3: Humanizar
        const humanPrompt = buildHumanResponsePrompt(question, data);
        const resultHuman = await model.generateContent(humanPrompt);
        const answer = resultHuman.response.text().trim();

        // Responder en Telegram
        bot.sendMessage(chatId, `🗣️ ${answer}`);

    } catch (error) {
        console.error("Error en el bot:", error);
        
        if (error.message.includes("429")) {
            bot.sendMessage(chatId, "⚠️ Los servidores de IA están un poco saturados. Por favor, espera 30 segundos y vuelve a preguntar.");
        } else {
            bot.sendMessage(chatId, "❌ Lo siento, hubo un problema procesando tu consulta. Intenta con otra pregunta.");
        }
    }
});
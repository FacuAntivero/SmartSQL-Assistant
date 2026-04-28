// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const model = require('./src/config/gemini');
const { buildSqlPrompt, buildHumanResponsePrompt } = require('./src/core/promptBuilder');
const { initDB, executeQuery } = require('./src/db/connection');

const app = express();
// Render usa el puerto 10000 por defecto
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

initDB().then(() => {
    console.log("✅ Base de Datos de la Barbería lista.");
});

app.get('/', (req, res) => {
    res.send("🤖 BarberShop AI Assistant está corriendo en vivo.");
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor activo en el puerto ${PORT}`);
});

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error("❌ ERROR: Falta el TELEGRAM_TOKEN");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("📲 Bot de Telegram escuchando...");

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const question = msg.text;

    if (question === '/start') {
        return bot.sendMessage(chatId, "💈 ¡Hola! Soy el asistente de tu barbería. Pregúntame sobre ventas o barberos.");
    }

    bot.sendMessage(chatId, "⏳ Analizando...");

    try {
        // --- Fase 1: SQL ---
        const sqlPrompt = buildSqlPrompt(question);
        const resultSQL = await model.generateContent(sqlPrompt);
        const sqlResponse = resultSQL.response.text().trim();

        // Detectar si la pregunta está fuera de contexto
        if (sqlResponse.includes("NO_DATA")) {
            return bot.sendMessage(chatId, "🤔 No estoy seguro de cómo responder a eso. Por ahora solo puedo ayudarte con datos de la barbería (ventas, turnos, barberos).");
        }

        const sqlQuery = sqlResponse.replace(/```sql/g, '').replace(/```/g, '').trim();

        // --- Fase 2: Ejecutar ---
        const data = await executeQuery(sqlQuery);

        // --- Fase 3: Humanizar ---
        const humanPrompt = buildHumanResponsePrompt(question, data);
        const resultHuman = await model.generateContent(humanPrompt);
        const answer = resultHuman.response.text().trim();

        bot.sendMessage(chatId, `🗣️ ${answer}`);

    } catch (error) {
        console.error("DEBUG ERROR:", error);
        
        // Error de cuota (Tokens agotados)
        if (error.message.includes("429") || error.message.toLowerCase().includes("quota")) {
            return bot.sendMessage(chatId, "🪫 He agotado mis créditos gratuitos de IA por ahora. Por favor, intenta de nuevo más tarde.");
        } 
        
        // Error de base de datos (Pregunta válida pero SQL mal formado)
        if (error.message.includes("SQLITE_ERROR")) {
            return bot.sendMessage(chatId, "🔍 No pude encontrar información exacta para esa pregunta en mis registros.");
        }

        // Error técnico general
        bot.sendMessage(chatId, "❌ Lo siento, hubo un problema procesando tu consulta. Intenta reformular la pregunta.");
    }
});
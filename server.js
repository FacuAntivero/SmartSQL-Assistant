// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const model = require('./src/config/gemini');
const { buildSqlPrompt, buildHumanResponsePrompt } = require('./src/core/promptBuilder');
const { initDB, executeQuery } = require('./src/db/connection');

const app = express();
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
    const chatId = msg.chat.id.toString();
    const question = msg.text;
    const userName = msg.from.first_name || 'Usuario';
    
    // --- GESTIÓN DE USUARIOS Y ROLES (RBAC) ---
    let userRole = 'CLIENTE'; // Rol por defecto
    try {
        const users = await executeQuery(`SELECT rol FROM usuarios WHERE telegram_id = '${chatId}'`);
        
        if (users.length === 0) {
            // Si el usuario no existe, lo registramos como CLIENTE
            await executeQuery(`INSERT INTO usuarios (telegram_id, nombre, rol) VALUES ('${chatId}', '${userName}', 'CLIENTE')`);
            console.log(`👤 Nuevo usuario registrado: ${userName} con ID ${chatId}`);
        } else {
            // Si ya existe, obtenemos su rol actual
            userRole = users[0].rol;
        }
    } catch (dbError) {
        console.error("❌ Error en la base de datos de usuarios:", dbError);
    }

    // --- COMANDOS MÁGICOS PARA PRUEBAS (SOLO DEMOSTRACIÓN) ---
    if (question === '/soybarbero') {
        await executeQuery(`UPDATE usuarios SET rol = 'BARBERO' WHERE telegram_id = '${chatId}'`);
        return bot.sendMessage(chatId, "👨‍⚖️ ¡Modo Administrador activado! Ahora tienes rol de BARBERO y puedes ver datos financieros.");
    }

    if (question === '/soycliente') {
        await executeQuery(`UPDATE usuarios SET rol = 'CLIENTE' WHERE telegram_id = '${chatId}'`);
        return bot.sendMessage(chatId, "💇‍♂️ ¡Modo Cliente activado! Ahora el sistema te tratará como un cliente normal.");
    }

    if (question === '/start') {
        return bot.sendMessage(chatId, `💈 ¡Hola, ${userName}! Soy la IA de la barbería.\n\nTu rol actual es: *${userRole}*.\n\n*(Tip de prueba: Usa /soybarbero o /soycliente para cambiar tu rol)*`);
    }

    bot.sendMessage(chatId, "⏳ Analizando...");

    try {
        // --- Fase 1: SQL ---
        // Fíjate que ahora le pasamos el userRole al promptBuilder
        const sqlPrompt = buildSqlPrompt(question, userRole);
        const resultSQL = await model.generateContent(sqlPrompt);
        const sqlResponse = resultSQL.response.text().trim();

        // Detectar si la pregunta está fuera de contexto O si fue denegada por seguridad
        if (sqlResponse.includes("NO_DATA")) {
            return bot.sendMessage(chatId, "🤔 No estoy seguro de cómo responder a eso. Por ahora solo puedo ayudarte con información de la barbería.");
        }
        
        if (sqlResponse.includes("ACCESO_DENEGADO")) {
            return bot.sendMessage(chatId, "⛔ Acceso Denegado. Tu rol de CLIENTE no te permite ver información financiera o privada de la barbería.");
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
        
        if (error.message.includes("429") || error.message.toLowerCase().includes("quota")) {
            return bot.sendMessage(chatId, "🪫 He agotado mis créditos gratuitos de IA por ahora. Por favor, intenta de nuevo más tarde.");
        } 
        
        if (error.message.includes("SQLITE_ERROR")) {
            return bot.sendMessage(chatId, "🔍 No pude encontrar información exacta para esa pregunta en mis registros.");
        }

        bot.sendMessage(chatId, "❌ Lo siento, hubo un problema procesando tu consulta. Intenta reformular la pregunta.");
    }
});
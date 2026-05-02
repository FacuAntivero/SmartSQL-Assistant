// src/bot/telegramBot.js
const TelegramBot = require('node-telegram-bot-api');
const { executeQuery } = require('../db/connection');
const { processUserMessage, clearSession } = require('../services/aiService');

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error("❌ ERROR: Falta el TELEGRAM_TOKEN");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("📲 Bot de Telegram escuchando...");

bot.on('message', async (msg) => {
    if (!msg.text) return; 

    const chatId = msg.chat.id.toString();
    const question = msg.text;
    const userName = msg.from.first_name || 'Usuario';
    
    let userRole = 'CLIENTE'; 
    try {
        const users = await executeQuery(`SELECT rol FROM usuarios WHERE telegram_id = $1`, [chatId]);
        if (users.length === 0) {
            await executeQuery(`INSERT INTO usuarios (telegram_id, nombre, rol) VALUES ($1, $2, 'CLIENTE')`, [chatId, userName]);
        } else {
            userRole = users[0].rol;
        }
    } catch (dbError) {
        console.error("❌ Error DB:", dbError);
    }

    if (question === '/soybarbero') {
        await executeQuery(`UPDATE usuarios SET rol = 'BARBERO' WHERE telegram_id = $1`, [chatId]);
        clearSession(chatId);
        return bot.sendMessage(chatId, "👨‍⚖️ Modo Administrador activado. Eres BARBERO. Escribe /start para ver tu menú.");
    }

    if (question === '/soycliente') {
        await executeQuery(`UPDATE usuarios SET rol = 'CLIENTE' WHERE telegram_id = $1`, [chatId]);
        clearSession(chatId);
        return bot.sendMessage(chatId, "💇‍♂️ Modo Cliente activado. Escribe /start para ver tu menú.");
    }

    if (question === '/start') {
        clearSession(chatId);
        let botones = userRole === 'BARBERO' 
            ? [[{ text: "💰 Ver ganancias", callback_data: "accion_finanzas" }]] 
            : [[{ text: "📅 Agendar un turno", callback_data: "accion_agendar" }]];
        
        botones.push([{ text: "🕒 Ver turnos ocupados", callback_data: "accion_ver_turnos" }]);

        return bot.sendMessage(chatId, `💈 ¡Hola, ${userName}! Tu rol actual es: *${userRole}*.`, {
            reply_markup: { inline_keyboard: botones }
        });
    }

    bot.sendMessage(chatId, "⏳ Pensando...");
    
    // Delegamos toda la lógica compleja al servicio
    const answer = await processUserMessage(chatId, question, userName, userRole);
    bot.sendMessage(chatId, `🗣️ ${answer}`);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data; 
    bot.answerCallbackQuery(query.id); 

    if (data === 'accion_agendar') bot.sendMessage(chatId, "¡Excelente! Dime, ¿para qué fecha, hora y con qué barbero te gustaría tu turno?");
    else if (data === 'accion_ver_turnos') bot.sendMessage(chatId, "Perfecto. ¿De qué fecha te gustaría consultar la disponibilidad?");
    else if (data === 'accion_finanzas') bot.sendMessage(chatId, "👨‍⚖️ Modo Admin: ¿De qué fecha o barbero quieres ver el reporte financiero?");
});

module.exports = bot; // Exportamos por si acaso
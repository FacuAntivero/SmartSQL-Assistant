// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const model = require('./src/config/gemini');
const { initDB, executeQuery } = require('./src/db/connection');
const { executeTool } = require('./src/core/agentTools');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

initDB().then(() => {
    console.log("✅ Base de Datos de la Barbería lista.");
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en el puerto ${PORT}`));

const token = process.env.TELEGRAM_TOKEN;
if (!token) {
    console.error("❌ ERROR: Falta el TELEGRAM_TOKEN");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("📲 Bot de Telegram escuchando...");

// Aquí guardaremos la memoria de las conversaciones por cada usuario
const chatSessions = {}; 

bot.on('message', async (msg) => {
    // Si el mensaje viene de un botón (callback_query), ignoramos este bloque para no duplicar respuestas
    if (!msg.text) return; 

    const chatId = msg.chat.id.toString();
    const question = msg.text;
    const userName = msg.from.first_name || 'Usuario';
    
    let userRole = 'CLIENTE'; 
    try {
        const users = await executeQuery(`SELECT rol FROM usuarios WHERE telegram_id = '${chatId}'`);
        if (users.length === 0) {
            await executeQuery(`INSERT INTO usuarios (telegram_id, nombre, rol) VALUES ('${chatId}', '${userName}', 'CLIENTE')`);
        } else {
            userRole = users[0].rol;
        }
    } catch (dbError) {
        console.error("❌ Error DB:", dbError);
    }

    // --- COMANDOS MÁGICOS ---
    if (question === '/soybarbero') {
        await executeQuery(`UPDATE usuarios SET rol = 'BARBERO' WHERE telegram_id = '${chatId}'`);
        delete chatSessions[chatId]; 
        return bot.sendMessage(chatId, "👨‍⚖️ Modo Administrador activado. Eres BARBERO. Escribe /start para ver tu nuevo menú.");
    }

    if (question === '/soycliente') {
        await executeQuery(`UPDATE usuarios SET rol = 'CLIENTE' WHERE telegram_id = '${chatId}'`);
        delete chatSessions[chatId]; 
        return bot.sendMessage(chatId, "💇‍♂️ Modo Cliente activado. Eres CLIENTE. Escribe /start para ver tu nuevo menú.");
    }

    if (question === '/start') {
        delete chatSessions[chatId]; 
        
        // INTERFAZ DINÁMICA (RBAC UI) - Esto suma muchos puntos en entrevistas
        let botones = [];
        
        if (userRole === 'BARBERO') {
            botones.push([{ text: "💰 Ver ganancias", callback_data: "accion_finanzas" }]);
        } else {
            botones.push([{ text: "📅 Agendar un turno", callback_data: "accion_agendar" }]);
        }
        botones.push([{ text: "🕒 Ver turnos ocupados", callback_data: "accion_ver_turnos" }]);

        const opciones = {
            reply_markup: { inline_keyboard: botones }
        };

        return bot.sendMessage(
            chatId, 
            `💈 ¡Hola, ${userName}! Soy el asistente IA de la barbería.\n\nTu rol actual es: *${userRole}*.\n\nPuedes escribirme o usar las opciones rápidas:`, 
            opciones
        );
    }

    bot.sendMessage(chatId, "⏳ Pensando...");

    try {
        // --- 1. MEMORIA CONVERSACIONAL ---
        if (!chatSessions[chatId]) {
            const today = new Date().toISOString().split('T')[0];
            const systemPrompt = `
                Eres el asistente cordial de una barbería. La fecha de hoy es ${today}. 
                El usuario con el que hablas tiene el rol de: ${userRole}.
                
                CATÁLOGO DE LA BASE DE DATOS (Usa estrictamente estos IDs numéricos al usar herramientas):
                Barberos: ID 1 (Marcos), ID 2 (Julian)
                Servicios: ID 1 (Corte Clásico), ID 2 (Corte y Barba), ID 3 (Coloración)

                Si el usuario quiere agendar un turno, pregúntale fecha, servicio y barbero ANTES de usar la herramienta de agendar.
            `;
            
            chatSessions[chatId] = model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "Entendido, actuaré bajo estas reglas." }] }
                ]
            });
        }

        const chat = chatSessions[chatId];

        // --- 2. EL BUCLE DEL AGENTE (FUNCTION CALLING) ---
        let result = await chat.sendMessage(question);
        const llamadas = typeof result.response.functionCalls === 'function' ? result.response.functionCalls() : result.response.functionCalls;

        if (llamadas && llamadas.length > 0) {
            const call = llamadas[0];
            const toolResult = await executeTool(call.name, call.args, userRole);
            result = await chat.sendMessage([{
                functionResponse: { name: call.name, response: toolResult }
            }]);
        }

        // --- 3. RESPUESTA FINAL AL USUARIO ---
        const answer = result.response.text();
        bot.sendMessage(chatId, `🗣️ ${answer}`);

    } catch (error) {
        console.error("DEBUG ERROR:", error);
        bot.sendMessage(chatId, "❌ Lo siento, hubo un problema procesando tu consulta. ¿Puedes reformularla?");
    }
});

// --- ESCUCHADOR DE EVENTOS: BOTONES DE TELEGRAM ---
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data; 
    
    bot.answerCallbackQuery(query.id); // Quita el icono de "cargando" del botón

    // Redireccionamos la intención del botón hacia el flujo de la IA
    if (data === 'accion_agendar') {
        bot.sendMessage(chatId, "¡Excelente! Dime, ¿para qué fecha y con qué barbero te gustaría tu turno?");
    } else if (data === 'accion_ver_turnos') {
        bot.sendMessage(chatId, "Perfecto. ¿De qué fecha te gustaría consultar la disponibilidad?");
    } else if (data === 'accion_finanzas') {
        bot.sendMessage(chatId, "👨‍⚖️ Modo Admin: ¿De qué fecha o barbero quieres ver el reporte financiero?");
    }
});
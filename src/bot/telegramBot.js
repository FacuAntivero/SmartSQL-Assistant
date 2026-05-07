const TelegramBot = require('node-telegram-bot-api');
const { executeQuery } = require('../db/connection');
const { processUserMessage, clearSession } = require('../services/aiService');

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

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
        console.error("Error DB:", dbError);
    }

    // Comandos de cambio de rol
    if (question === '/soybarbero') {
        await executeQuery(`UPDATE usuarios SET rol = 'BARBERO' WHERE telegram_id = $1`, [chatId]);
        clearSession(chatId);
        return bot.sendMessage(chatId, "Modo Administrador activado. Rol: BARBERO. Escribe /start para ver las opciones.");
    }

    if (question === '/soycliente') {
        await executeQuery(`UPDATE usuarios SET rol = 'CLIENTE' WHERE telegram_id = $1`, [chatId]);
        clearSession(chatId);
        return bot.sendMessage(chatId, "Modo Cliente activado. Escribe /start para comenzar.");
    }

    if (question === '/start') {
        clearSession(chatId);
        
        // Menús separados por rol
        let botones = userRole === 'BARBERO' 
            ? [
                [{ text: "Consultar finanzas", callback_data: "accion_finanzas" }],
                [{ text: "Ver turnos de la agenda", callback_data: "accion_ver_turnos_admin" }]
              ] 
            : [
                [{ text: "Agendar un turno", callback_data: "accion_agendar" }],
                [{ text: "Ver turnos ocupados", callback_data: "accion_ver_turnos" }]
              ];

        return bot.sendMessage(chatId, `Hola ${userName}. Tu rol actual es: ${userRole}.`, {
            reply_markup: { inline_keyboard: botones }
        });
    }

    // Mensaje de espera humanizado y serio según el rol
    const mensajeEspera = userRole === 'CLIENTE' 
        ? "Un momento por favor, verificando la agenda..." 
        : "Consultando la base de datos...";
    
    const waitMessage = await bot.sendMessage(chatId, mensajeEspera);

    const answer = await processUserMessage(chatId, question, userName, userRole);
    
    try {
        await bot.deleteMessage(chatId, waitMessage.message_id);
    } catch (e) {}
    
    bot.sendMessage(chatId, `${answer}`);
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id.toString();
    const data = query.data; 
    bot.answerCallbackQuery(query.id); 

    // Botones específicos para el Cliente
    if (data === 'accion_agendar') {
        try {
            const barberos = await executeQuery(`SELECT nombre FROM barberos`);
            const servicios = await executeQuery(`SELECT nombre, precio FROM servicios`);
            
            const listaBarberos = barberos.map(b => b.nombre).join('  |  ');
            const listaServicios = servicios.map(s => `${s.nombre}: $${s.precio}`).join('\n');

            const mensaje = `Para agendar tu turno, por favor revisa nuestras opciones:\n\n` +
                            `SERVICIOS DISPONIBLES:\n${listaServicios}\n\n` +
                            `NUESTROS BARBEROS:\n${listaBarberos}\n\n` +
                            `Dime qué servicio deseas, con quién y para qué fecha y hora.`;
            
            bot.sendMessage(chatId, mensaje);
        } catch (error) {
            bot.sendMessage(chatId, "Indícame el servicio, el barbero y el horario que prefieres para tu turno.");
        }
    }
    else if (data === 'accion_ver_turnos') {
        bot.sendMessage(chatId, "¿Para qué fecha deseas consultar los turnos ocupados?");
    }
    
    // Botones específicos para el Admin/Barbero
    else if (data === 'accion_finanzas') {
        const mensajeFinanzas = 
                                `Puedes consultarme por la recaudación de un día en particular, las ganancias de un barbero específico (Marcos o Julián), o los ingresos totales de un mes.\n\n` +
                                `¿Qué datos necesitas analizar?`;
        bot.sendMessage(chatId, mensajeFinanzas);
    }
    else if (data === 'accion_ver_turnos_admin') {
        bot.sendMessage(chatId, "Modo Agenda.\n\nPuedes consultar la agenda de Marcos o Julián. Por ejemplo:\n- '¿Qué turnos tiene Julián mañana?'\n- 'Mostrar todos los turnos ocupados de hoy'\n\n¿Qué agenda quieres revisar?");
    }
});
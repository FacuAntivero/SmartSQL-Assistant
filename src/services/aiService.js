const model = require('../config/gemini');
const { executeTool } = require('../core/agentTools');

// Almacén en memoria de las sesiones de chat
const chatSessions = {}; 

const processUserMessage = async (chatId, question, userName, userRole) => {
    // 1. Inicialización de la sesión si no existe
    if (!chatSessions[chatId]) {
        const today = new Date().toISOString().split('T')[0];
        
         const systemPromptCliente = `
            Eres Facu-Bot, un asistente virtual profesional y eficiente para una barbería.
            
            REGLAS DE TONO Y ESTILO:
            1. Habla de forma natural y humana. NO utilices emojis en tus respuestas habituales.
            2. Mantén un tono profesional, servicial y breve.
            3. MANEJO DE ERRORES: Si un turno no está disponible al agendar, sé muy preciso mencionando el barbero y la hora.
            
            REGLAS CRÍTICAS DE HERRAMIENTAS:
            1. ACCIÓN DIRECTA (AGENDAR): Cuando el cliente proponga una hora exacta para un turno, EJECUTA INMEDIATAMENTE 'agendar_turno' asumiendo los datos del contexto. NO utilices herramientas de consulta previa.
            2. CONSULTAR DISPONIBILIDAD: Si el cliente pregunta qué horarios están ocupados o responde a la pregunta de disponibilidad, usa la herramienta 'consultar_disponibilidad'. Los datos devueltos son los turnos YA OCUPADOS.
            3. CONFIRMACIÓN: Una vez que 'agendar_turno' devuelva éxito, confirma la reserva.
            
            DATOS DE HOY: ${today} | CLIENTE: ${userName} | ROL: ${userRole}
            CATÁLOGO: Barberos: Marcos (ID 1), Julian (ID 2). Servicios: Corte Clásico (1), Corte y Barba (2), Coloración (3).
        `;

        const systemPromptBarbero = `
            Eres el Asistente Analítico y Financiero de la barbería. Tu usuario es el Administrador/Barbero.
            REGLAS DE TONO: Profesional, claro y natural. Escribe como un humano, sin emojis.
            
            REGLAS CRÍTICAS:
            1. HERRAMIENTA PRINCIPAL: Usa 'consultar_informacion_general' SIEMPRE que te pregunten por ganancias, recaudación, turnos agendados o datos de los barberos.
            2. NO intentas agendar turnos bajo ninguna circunstancia.
            3. BARBEROS: Si preguntan qué barberos hay, indícale que están Marcos y Julián.
            4. RESPUESTA FINAL OBLIGATORIA (IMPORTANTE): Una vez que la herramienta te devuelva la información de la BD, ES OBLIGATORIO que redactes una respuesta final informando el resultado al usuario. NUNCA devuelvas una respuesta vacía.
            
            CONSEJOS TÉCNICOS PARA SQL (PostgreSQL):
            - La columna 'fecha' es de tipo DATE. NO uses 'LIKE' para fechas.
            - Para filtrar por mes y año actual, utiliza: EXTRACT(MONTH FROM fecha) = X AND EXTRACT(YEAR FROM fecha) = Y.
            
            FORMATO DE SALIDA:
            - Sé fluido y natural. Usa siempre el signo de pesos ($).
            - Para las fechas, utiliza texto natural (ej: "este mes de mayo", "el lunes 4").
            
            DATOS DE HOY: ${today} | USUARIO: ${userName} | ROL: ${userRole}
        `;

        const systemPrompt = userRole === 'BARBERO' ? systemPromptBarbero : systemPromptCliente;

        // Inicializar el chat en Gemini
        chatSessions[chatId] = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido, actuaré bajo este rol y reglas de forma estricta." }] }
            ]
        });
    }

    const chat = chatSessions[chatId];

    try {
        // 2. Enviar mensaje a la IA
        let result = await chat.sendMessage(question);
        const llamadas = typeof result.response.functionCalls === 'function' 
            ? result.response.functionCalls() 
            : result.response.functionCalls;

        let toolResult = null;

        // 3. Ejecución de herramientas (Function Calling)
        if (llamadas && llamadas.length > 0) {
            const call = llamadas[0];
            toolResult = await executeTool(call.name, call.args, userRole);
            
            try {
                 result = await chat.sendMessage([{
                    functionResponse: { name: call.name, response: toolResult }
                }]);
            } catch (aiError) {
                // Manejo de errores específicos post-herramienta
                if (userRole === 'BARBERO') {
                    return "Ocurrió un error al procesar la consulta en la base de datos. Por favor, intenta reformular tu pregunta analítica.";
                }

                if (toolResult.error === 'SOLAPAMIENTO') {
                    return "El horario que elegiste ya se encuentra ocupado. ¿Te gustaría probar con otro horario o con un barbero diferente?";
                }
                
                return toolResult.exito 
                    ? "¡Perfecto! Tu turno ha sido confirmado y ya está agendado en nuestro sistema. ¡Te esperamos!" 
                    : "Lo siento, ese horario ya se encuentra reservado. ¿Podrías indicarme otro horario, por favor?";
            }
        }

         const finalAnswer = result.response.text();
        
        // Salvavidas: Si la IA se queda muda
        if (!finalAnswer || finalAnswer.trim() === '') {
            // Si es Barbero y tenemos datos, mostramos el JSON crudo para no perder la info
            if (userRole === 'BARBERO' && toolResult) {
                return `Aquí tienes los datos crudos de tu consulta (la IA omitió redactarlos): \n${JSON.stringify(toolResult, null, 2)}`;
            }
            
            // Textos por defecto si no hay datos
            return userRole === 'BARBERO' 
                ? "Consulta ejecutada correctamente, pero no se obtuvieron datos para mostrar." 
                : "¡Listo! Tu turno quedó agendado con éxito. ¡Nos vemos en la barbería!";
        }
        
        return finalAnswer;

    } catch (error) {
        console.error("DEBUG ERROR AI:", error);
        return "Mis sistemas están experimentando una alta demanda. Por favor, intenta nuevamente en unos instantes.";
    }
};

const clearSession = (chatId) => { 
    delete chatSessions[chatId]; 
};

module.exports = { processUserMessage, clearSession };
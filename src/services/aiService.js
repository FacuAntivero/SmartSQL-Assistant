// src/services/aiService.js
const model = require('../config/gemini');
const { executeTool } = require('../core/agentTools');

const chatSessions = {}; 

const processUserMessage = async (chatId, question, userName, userRole) => {
    // 1. Inicializar Memoria si no existe
    if (!chatSessions[chatId]) {
        const today = new Date().toISOString().split('T')[0];
        const systemPrompt = `
            Eres "Facu-Bot", el asistente humano, rápido y buena onda de la barbería.
            REGLAS CRÍTICAS:
            1. EJECUTA LA HERRAMIENTA inmediatamente sin avisar antes ("Un momento", "Reviso").
            2. Habla como por WhatsApp. Usa emojis.
            3. NO SEAS REPETITIVO. Usa la memoria.
            4. SECRETO PROFESIONAL: Jamás muestres IDs numéricos.
            DATOS DE HOY: ${today} | CLIENTE: ${userName} | ROL: ${userRole}
            CATÁLOGO: Barberos: Marcos (ID 1), Julian (ID 2). Servicios: Corte Clásico (1), Corte y Barba (2), Coloración (3).
        `;
        
        chatSessions[chatId] = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido, actuaré bajo estas reglas." }] }
            ]
        });
    }

    const chat = chatSessions[chatId];

    try {
        // 2. Bucle del Agente
        let result = await chat.sendMessage(question);
        const llamadas = typeof result.response.functionCalls === 'function' ? result.response.functionCalls() : result.response.functionCalls;

        if (llamadas && llamadas.length > 0) {
            const call = llamadas[0];
            const toolResult = await executeTool(call.name, call.args, userRole);
            
            try {
                result = await chat.sendMessage([{
                    functionResponse: { name: call.name, response: toolResult }
                }]);
            } catch (aiError) {
                console.error("⚠️ Error de IA post-herramienta. Activando Fallback Inteligente.");
                
                // FALLBACK INTELIGENTE
                if (call.name === 'consultar_informacion_general' && toolResult.exito) {
                    return `✅ Los datos se extrajeron bien de la base de datos, pero mi módulo de lenguaje está saturado. Aquí tienes el reporte crudo: ${JSON.stringify(toolResult.datos_encontrados)}`;
                }
                
                return toolResult.exito 
                    ? "✅ ¡Listo! Te confirmo que tu solicitud se procesó correctamente en nuestro sistema." 
                    : "❌ Hubo un problema procesando tu solicitud o el horario ya está ocupado.";
            }
        }

        // 3. Respuesta Final
        return result.response.text();
    } catch (error) {
        console.error("DEBUG ERROR AI:", error);
        return "❌ Mis circuitos están un poco saturados en este momento. ¿Podrías intentar de nuevo en un minuto?";
    }
};

// Función para resetear memoria (ej: al usar /start)
const clearSession = (chatId) => { delete chatSessions[chatId]; };

module.exports = { processUserMessage, clearSession };
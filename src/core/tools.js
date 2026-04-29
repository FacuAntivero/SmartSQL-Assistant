// src/core/tools.js

const barberTools = {
    // Declaración de las herramientas para que Gemini las entienda
    declarations: [
        {
            name: "consultar_informacion_general",
            description: "Útil para responder preguntas generales sobre la barbería: cuánto facturó un barbero, qué servicios hay, precios, o turnos pasados.",
            parameters: {
                type: "OBJECT",
                properties: {
                    pregunta_refinada: {
                        type: "STRING",
                        description: "La pregunta original del usuario reformulada de manera clara para buscar en la base de datos."
                    }
                },
                required: ["pregunta_refinada"]
            }
        },
        {
            name: "consultar_disponibilidad",
            description: "Útil para saber si hay turnos disponibles en una fecha específica, y opcionalmente para un barbero específico.",
            parameters: {
                type: "OBJECT",
                properties: {
                    fecha: {
                        type: "STRING",
                        description: "La fecha a consultar en formato YYYY-MM-DD."
                    },
                    barbero_id: {
                        type: "INTEGER",
                        description: "El ID del barbero. Dejar vacío si el cliente no especifica barbero."
                    }
                },
                required: ["fecha"]
            }
        },
        {
            name: "agendar_turno",
            description: "Usa esta herramienta ÚNICAMENTE cuando el cliente ya confirmó la fecha, el servicio y el barbero que desea.",
            parameters: {
                type: "OBJECT",
                properties: {
                    fecha: {
                        type: "STRING",
                        description: "Fecha del turno en formato YYYY-MM-DD."
                    },
                    servicio_id: {
                        type: "INTEGER",
                        description: "ID del servicio que eligió el cliente."
                    },
                    barbero_id: {
                        type: "INTEGER",
                        description: "ID del barbero que eligió el cliente."
                    }
                },
                required: ["fecha", "servicio_id", "barbero_id"]
            }
        }
    ]
};

module.exports = barberTools;
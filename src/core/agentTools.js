// src/core/agentTools.js
const { executeQuery } = require('../db/connection');
const model = require('../config/gemini');
const { buildSqlPrompt } = require('./promptBuilder');

const executeTool = async (functionName, args, userRole) => {
    console.log(`\n🔧 [Agente] Ejecutando herramienta: ${functionName}`);
    console.log(`📦 [Agente] Parámetros recibidos:`, args);

    switch (functionName) {
        case 'consultar_informacion_general':
            return await handleInformacionGeneral(args.pregunta_refinada, userRole);
        case 'consultar_disponibilidad':
            return await handleDisponibilidad(args.fecha, args.barbero_id);
        case 'agendar_turno':
            return await handleAgendarTurno(args.fecha, args.hora, args.servicio_id, args.barbero_id);
        default:
            return { error: `La herramienta ${functionName} no está programada en el sistema.` };
    }
};

// 1. Información General (Text-to-SQL Mejorado y Blindado)
const handleInformacionGeneral = async (pregunta, userRole) => {
    try {
        // Le pasamos la fecha actual para que la IA entienda cuándo es "hoy" o "este mes"
        const fechaActual = new Date().toISOString().split('T')[0];
        const sqlPrompt = buildSqlPrompt(pregunta, userRole, fechaActual);
        
        const resultSQL = await model.generateContent(sqlPrompt);
        const sqlResponse = resultSQL.response.text().trim();

        if (sqlResponse.includes("NO_DATA")) return { error: "Pregunta fuera de contexto o no relacionada con la barbería." };
        if (sqlResponse.includes("ACCESO_DENEGADO")) return { error: "Acceso Denegado. Como cliente no puedes ver esta información financiera." };

        // Limpiamos la respuesta por si la IA le pone formato Markdown de código
        const sqlQuery = sqlResponse.replace(/```sql/g, '').replace(/```/g, '').trim();
        console.log(`🔍 [SQL Generado Dinámicamente]: ${sqlQuery}`);
        
        // Try-catch interno: Si la IA escribe mal el SQL, atrapamos el error aquí
        try {
            const data = await executeQuery(sqlQuery);
            return { 
                exito: true, 
                instruccion_para_ia: "Aquí tienes los datos extraídos de la base de datos. Analízalos, suma o calcula lo que sea necesario, y respóndele al usuario de forma natural, resumida y conversacional.",
                datos_encontrados: data 
            };
        } catch (dbError) {
            console.error("❌ [Text-to-SQL Error DB]:", dbError.message);
            return { 
                exito: false, 
                error: "El sistema intentó buscar los datos pero la consulta generada no fue compatible. Dile al usuario que hubo un error técnico al generar el reporte." 
            };
        }
    } catch (error) {
        console.error("❌ [Text-to-SQL Error IA]:", error);
        return { exito: false, error: "No se pudo interpretar la pregunta para convertirla en una consulta a la base de datos." };
    }
};

// 2. Consultar Disponibilidad de Turnos
const handleDisponibilidad = async (fecha, barbero_id) => {
    let query = `SELECT turnos.id, barberos.nombre as barbero, servicios.nombre as servicio, turnos.fecha, turnos.hora
                 FROM turnos
                 JOIN barberos ON turnos.barbero_id = barberos.id
                 JOIN servicios ON turnos.servicio_id = servicios.id
                 WHERE turnos.fecha = $1`;
    let params = [fecha];

    if (barbero_id) {
        query += ` AND turnos.barbero_id = $2`;
        params.push(barbero_id);
    }

    try {
        const ocupados = await executeQuery(query, params);
        return { 
            instruccion_para_ia: `Hay ${ocupados.length} turnos registrados. Usa esta información para decirle al usuario qué HORARIOS están ocupados en esa fecha.`,
            turnos_ocupados: ocupados 
        };
    } catch (error) {
        console.error("❌ Error en handleDisponibilidad:", error);
        return { error: "Error de base de datos al consultar la disponibilidad." };
    }
};

// 3. Agendar Turno
const handleAgendarTurno = async (fecha, hora, servicio_id, barbero_id) => {
    try {
        const checkQuery = `SELECT id FROM turnos WHERE fecha = $1 AND hora = $2 AND barbero_id = $3`;
        const ocupados = await executeQuery(checkQuery, [fecha, hora, barbero_id]);
        
        if (ocupados.length > 0) {
            console.log(`⚠️ [Agente] Solapamiento detectado: Barbero ${barbero_id} el ${fecha} a las ${hora}`);
            return { 
                exito: false, 
                instruccion_para_ia: `El turno de las ${hora} ya está ocupado. Discúlpate y ofrécele otro horario.` 
            };
        }

        const insertQuery = `INSERT INTO turnos (barbero_id, servicio_id, fecha, hora, propina) VALUES ($1, $2, $3, $4, 0)`;
        await executeQuery(insertQuery, [barbero_id, servicio_id, fecha, hora]);
        
        return { 
            exito: true, 
            instruccion_para_ia: `El turno se guardó exitosamente para el ${fecha} a las ${hora}. Confírmaselo al cliente de forma entusiasta.` 
        };
        
    } catch (error) {
        console.error("❌ Error en handleAgendarTurno:", error);
        return { exito: false, error: "Error técnico al intentar guardar el turno en la base de datos." };
    }
};

module.exports = { executeTool };
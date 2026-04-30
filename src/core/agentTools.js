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
            return await handleAgendarTurno(args.fecha, args.servicio_id, args.barbero_id);
        default:
            return { error: `La herramienta ${functionName} no está programada en el sistema.` };
    }
};

// --- LÓGICA DE CADA HERRAMIENTA ---

// 1. Información General (Nuestro antiguo Text-to-SQL, ahora encapsulado como una herramienta más)
const handleInformacionGeneral = async (pregunta, userRole) => {
    try {
        const sqlPrompt = buildSqlPrompt(pregunta, userRole);
        const resultSQL = await model.generateContent(sqlPrompt);
        const sqlResponse = resultSQL.response.text().trim();

        // Control de Seguridad (RBAC) inyectado directamente en la herramienta
        if (sqlResponse.includes("NO_DATA")) {
            return { error: "Pregunta fuera de contexto." };
        }
        if (sqlResponse.includes("ACCESO_DENEGADO")) {
            return { error: "Acceso Denegado. El cliente intentó ver datos financieros confidenciales." };
        }

        const sqlQuery = sqlResponse.replace(/```sql/g, '').replace(/```/g, '').trim();
        console.log(`🔍 [SQL Generado]: ${sqlQuery}`);
        
        const data = await executeQuery(sqlQuery);
        return { exito: true, datos_encontrados: data };
    } catch (error) {
        return { exito: false, error: "No se pudo consultar la base de datos para esta información." };
    }
};

// 2. Consultar Disponibilidad de Turnos (Lectura)
const handleDisponibilidad = async (fecha, barbero_id) => {
    let query = `SELECT turnos.id, barberos.nombre as barbero, servicios.nombre as servicio, turnos.fecha
                 FROM turnos
                 JOIN barberos ON turnos.barbero_id = barberos.id
                 JOIN servicios ON turnos.servicio_id = servicios.id
                 WHERE turnos.fecha = '${fecha}'`;
    
    // Si el usuario especificó un barbero, filtramos la búsqueda
    if (barbero_id) {
        query += ` AND turnos.barbero_id = ${barbero_id}`;
    }

    try {
        const ocupados = await executeQuery(query);
        return { 
            instruccion_para_ia: `Hay ${ocupados.length} turnos registrados para estos criterios. Usa esta información para decirle al usuario qué horarios están ocupados.`,
            turnos_ocupados: ocupados 
        };
    } catch (error) {
        return { error: "Error de base de datos al consultar la disponibilidad." };
    }
};

// 3. Agendar Turno (Escritura/Transaccional)
const handleAgendarTurno = async (fecha, servicio_id, barbero_id) => {
    try {
        // --- 1. VALIDACIÓN (Prevención de Double-Booking) ---
        const checkQuery = `SELECT id FROM turnos WHERE fecha = '${fecha}' AND barbero_id = ${barbero_id}`;
        const ocupados = await executeQuery(checkQuery);
        
        if (ocupados.length > 0) {
            // Si el array tiene elementos, significa que ya hay un turno agendado
            console.log(`⚠️ [Agente] Intento de solapamiento detectado para el barbero ${barbero_id} en la fecha ${fecha}`);
            return { 
                exito: false, 
                instruccion_para_ia: "El barbero ya tiene un turno ocupado en esa fecha exacta. Dile al cliente que ese espacio no está disponible, discúlpate y ofrécele buscar otra fecha u otro barbero." 
            };
        }

        // --- 2. INSERCIÓN (Si el espacio está libre) ---
        const insertQuery = `INSERT INTO turnos (barbero_id, servicio_id, fecha, propina) VALUES (${barbero_id}, ${servicio_id}, '${fecha}', 0)`;
        await executeQuery(insertQuery);
        
        return { 
            exito: true, 
            instruccion_para_ia: "El turno se guardó de forma exitosa en la base de datos. Comunícaselo al cliente de forma entusiasta y recuérdale la fecha." 
        };
        
    } catch (error) {
        console.error("❌ Error en handleAgendarTurno:", error);
        return { exito: false, error: "Error técnico al intentar guardar el turno en la base de datos." };
    }
};

module.exports = { executeTool };
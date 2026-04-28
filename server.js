// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const model = require('./src/config/gemini');
const { buildSqlPrompt, buildHumanResponsePrompt } = require('./src/core/promptBuilder');
const { initDB, executeQuery } = require('./src/db/connection');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Inicializar DB antes de arrancar el servidor
initDB().then(() => {
    console.log("✅ Base de Datos de la Barbería lista.");
});

// ENDPOINT PRINCIPAL: El cerebro de la IA
app.post('/api/ask', async (req, res) => {
    const { question } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Debes enviar una pregunta en el cuerpo (question)." });
    }

    try {
        // 1. Generar SQL
        const sqlPrompt = buildSqlPrompt(question);
        const resultSQL = await model.generateContent(sqlPrompt);
        const sqlQuery = resultSQL.response.text().trim().replace(/```sql/g, '').replace(/```/g, '').trim();

        // 2. Ejecutar en DB
        const data = await executeQuery(sqlQuery);

        // 3. Humanizar respuesta
        const humanPrompt = buildHumanResponsePrompt(question, data);
        const resultHuman = await model.generateContent(humanPrompt);
        const answer = resultHuman.response.text().trim();

        // Respondemos con todo para que el cliente tenga trazabilidad
        res.json({
            question,
            answer,
            metadata: {
                sqlGenerated: sqlQuery,
                dbRawResult: data
            }
        });

    }  catch (error) {
    if (error.message.includes("429")) {
        return res.status(429).json({
            error: "Límite de la IA alcanzado",
            message: "Estamos procesando muchas consultas. Por favor, espera 30 segundos y vuelve a intentarlo."
        });
    }
    console.error("Error en el flujo de IA:", error);
    res.status(500).json({ error: "Error interno del servidor" });
}
});

app.listen(PORT, () => {
    console.log(`🚀 SmartSQL API corriendo en http://localhost:${PORT}`);
    console.log(`📌 Endpoint listo: POST http://localhost:${PORT}/api/ask`);
});
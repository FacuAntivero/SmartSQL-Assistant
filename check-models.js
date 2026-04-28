// check-models.js
require('dotenv').config();

async function checkAvailableModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
        console.error("❌ No se encontró la API Key.");
        return;
    }

    console.log("🔍 Consultando directamente a Google qué modelos tienes habilitados...");
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.models) {
            console.log("\n✅ Modelos disponibles para generar texto (generateContent):");
            // Filtramos solo los modelos que sirven para generar texto y limpiamos el prefijo 'models/'
            data.models.forEach(model => {
                if (model.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`👉 ${model.name.replace('models/', '')}`);
                }
            });
            console.log("\nCopia uno de los nombres con '👉' y pégalo en src/config/gemini.js");
        } else {
            console.log("❌ Error en la respuesta de Google:", data);
        }
    } catch (error) {
        console.error("❌ Error de conexión:", error.message);
    }
}

checkAvailableModels();
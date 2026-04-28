# 💈 BarberShop AI Assistant (Text-to-SQL API)

Una API RESTful impulsada por IA que traduce preguntas en lenguaje natural a consultas SQL precisas, las ejecuta en una base de datos relacional y devuelve respuestas humanizadas. Construida con un patrón **RAG estructurado**.

## 🚀 Características Principales

- **Text-to-SQL Directo**: Convierte lenguaje natural complejo en sentencias de SQLite puro usando el modelo `gemini-2.5-flash`.
- **Arquitectura de Doble Agente**: Un agente se encarga de la lógica de datos (SQL) y un segundo agente toma los datos crudos para generar una respuesta conversacional.
- **Contexto Temporal Dinámico**: El sistema calcula y provee el contexto de tiempo ("hoy", "ayer") para consultas relativas.
- **Trazabilidad Completa**: La API devuelve tanto la respuesta final como los metadatos de la consulta SQL ejecutada para su auditoría.

## 🛠️ Tecnologías Utilizadas

- **Backend**: Node.js, Express
- **Base de Datos**: SQLite3 (en memoria para el MVP)
- **Inteligencia Artificial**: Google Generative AI (Gemini 2.5 Flash)

## 📦 Instalación y Uso

1. Clona el repositorio:
   \`\`\`bash
   git clone https://github.com/tu-usuario/barbershop-ai-api.git
   \`\`\`
2. Instala las dependencias:
   \`\`\`bash
   npm install
   \`\`\`
3. Configura tus variables de entorno creando un archivo \`.env\`:
   \`\`\`text
   GEMINI_API_KEY=tu_api_key_aqui
   PORT=3000
   \`\`\`
4. Inicia el servidor:
   \`\`\`bash
   node server.js
   \`\`\`

## 🧠 Ejemplo de Uso (Endpoint Principal)

**POST** \`/api/ask\`

*Cuerpo de la petición (JSON):*
\`\`\`json
{
  "question": "¿Cuánto facturó Marcos ayer?"
}
\`\`\`

*Respuesta exitosa:*
\`\`\`json
{
  "question": "¿Cuánto facturó Marcos ayer?",
  "answer": "Marcos facturó un total de $37 ayer.",
  "metadata": {
    "sqlGenerated": "SELECT SUM(s.precio) FROM turnos t JOIN barberos b ON t.barbero_id = b.id JOIN servicios s ON t.servicio_id = s.id WHERE b.nombre = 'Marcos' AND t.fecha = '2026-04-26';",
    "dbRawResult": [
      {
        "SUM(s.precio)": 37
      }
    ]
  }
}
\`\`\`
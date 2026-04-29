// src/config/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const barberTools = require('../core/tools'); // <-- 1. Importamos las herramientas
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: No se encontró GEMINI_API_KEY en el archivo .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    // 2. Le decimos a Gemini qué herramientas puede usar
    tools: [{ functionDeclarations: barberTools.declarations }] 
});

module.exports = model;
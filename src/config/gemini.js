// src/config/gemini.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ ERROR: No se encontró GEMINI_API_KEY en el archivo .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Cambiamos 'gemini-1.5-flash' por el clásico y confiable 'gemini-pro'
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash" 
});

module.exports = model;
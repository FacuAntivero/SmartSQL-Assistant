// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./src/db/connection');

// Al requerir el archivo, el bot arranca automáticamente
require('./src/bot/telegramBot'); 

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

initDB().then(() => {
    console.log("✅ Base de Datos de la Barbería lista.");
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en el puerto ${PORT}`));
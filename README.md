# 💈 SmartSQL Barber Assistant (Telegram AI Agent)

Un asistente virtual inteligente para Telegram que no solo chatea, sino que **actúa y analiza**. Impulsado por Google Gemini y PostgreSQL, combina la ejecución de herramientas (Function Calling) para agendar turnos y generación dinámica de Text-to-SQL para análisis financiero.

## 🚀 Características Principales

- **Agendamiento Autónomo (Function Calling):** El bot entiende el lenguaje natural del cliente, verifica disponibilidad en tiempo real y guarda el turno en la base de datos previniendo solapamientos.
- **Inteligencia Financiera (Text-to-SQL):** Los administradores pueden preguntar cosas como *"¿Cuánto facturó Marcos ayer?"*. La IA lee el esquema relacional, genera una consulta SQL pura con JOINs complejos, la ejecuta de forma segura y devuelve un resumen humano.
- **Control de Acceso (RBAC):** Separación estricta entre CLIENTE y BARBERO. La IA denegará automáticamente cualquier consulta financiera si el usuario no tiene el rol adecuado.
- **Contexto Temporal Dinámico:** El sistema inyecta la fecha actual del servidor en los prompts para que la IA entienda referencias relativas como "hoy", "ayer" o "este mes".
- **Resiliencia Activa:** Fallbacks inteligentes implementados para manejar caídas de la API de IA o saturación de demanda sin dejar al usuario sin respuesta.

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js
- **Base de Datos:** PostgreSQL Serverless (Neon.tech)
- **Inteligencia Artificial:** Google Generative AI (Modelo gemini-2.5-flash-lite)
- **Interfaz:** Telegram Bot API (node-telegram-bot-api)

## 📦 Instalación y Uso Local

1. Clonar el repositorio:
    git clone https://github.com/tu-usuario/smartsql-assistant.git

2. Instalar dependencias:
    npm install

3. Configurar variables de entorno:
   Crea un archivo .env en la raíz del proyecto con el siguiente contenido:

    TELEGRAM_TOKEN=tu_token_de_botfather
    GEMINI_API_KEY=tu_api_key_de_google_ai
    DATABASE_URL=tu_url_de_conexion_de_neon_postgres
    PORT=10000

4. Iniciar el servidor:
    node server.js

## 🧠 Flujos de Ejemplo en Telegram

### Modo Cliente (/soycliente)
- **Usuario:** "Quiero un corte clásico mañana a las 15 con Julián."
- **Bot:** (Internamente busca disponibilidad y ejecuta la herramienta) -> "¡Excelente, Facundo! Turno agendado para mañana a las 15:00 con Julián. ¡Te esperamos! 😎"

### Modo Barbero/Admin (/soybarbero)
- **Usuario:** "¿Cuánto facturó Julián en lo que va del mes?"
- **Bot:** (Genera y ejecuta SQL) -> "Julián lleva facturados $2000 en lo que va de mayo. 💪"
- **Usuario:** "¿Y Marcos?"
- **Bot:** "Marcos aún no ha registrado facturación en este período. 😅"
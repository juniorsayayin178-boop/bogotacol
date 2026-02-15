
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const BASE_URL = process.env.BASE_URL;

// Almacenamiento simple (producción: usar base de datos)
const requests = {};

/* =========================
   Crear solicitud
========================= */
app.post("/api/solicitud", async (req, res) => {
  try {
    const { nombre } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: "Nombre requerido" });
    }

    const requestId = crypto.randomUUID();
    requests[requestId] = "pendiente";

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📩 Nueva solicitud\n\n👤 ${nombre}\n\nID: ${requestId}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Aprobar", callback_data: `ok_${requestId}` },
            { text: "❌ Rechazar", callback_data: `error_${requestId}` }
          ]
        ]
      }
    });

    res.json({ requestId });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Error creando solicitud" });
  }
});

/* =========================
   Consultar estado
========================= */
app.get("/api/estado/:id", (req, res) => {
  const id = req.params.id;

  if (!requests[id]) {
    return res.status(404).json({ error: "No encontrado" });
  }

  res.json({ estado: requests[id] });
});

/* =========================
   Webhook Telegram
========================= */
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  const body = req.body;

  if (body.callback_query) {
    const data = body.callback_query.data;
    const [accion, requestId] = data.split("_");

    if (requests[requestId]) {
      requests[requestId] = accion === "ok" ? "ok" : "error";
    }

    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
      { callback_query_id: body.callback_query.id }
    );
  }

  res.sendStatus(200);
});

/* =========================
   Configurar webhook
========================= */
app.get("/setwebhook", async (req, res) => {
  const webhookUrl = `${BASE_URL}/webhook/${BOT_TOKEN}`;

  const response = await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    { url: webhookUrl }
  );

  res.json(response.data);
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor iniciado");
});
=======
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const BASE_URL = process.env.BASE_URL; // URL pública de Render

// Endpoint para enviar mensaje
app.post("/api/notificar", async (req, res) => {
  try {
    const { nombre, mensaje } = req.body;

    if (!nombre || !mensaje) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    await axios.post(telegramUrl, {
      chat_id: CHAT_ID,
      text: `📩 Nuevo mensaje\n\n👤 ${nombre}\n📝 ${mensaje}`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ OK", callback_data: "ok" },
            { text: "❌ Error", callback_data: "error" }
          ]
        ]
      }
    });

    res.json({ success: true });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Error enviando mensaje" });
  }
});

// Webhook para recibir botones
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  const body = req.body;

  if (body.callback_query) {
    const callbackData = body.callback_query.data;
    const messageId = body.callback_query.message.message_id;
    const chatId = body.callback_query.message.chat.id;

    let textoRespuesta = "";

    if (callbackData === "ok") {
      textoRespuesta = "✅ Operación aprobada";
    } else if (callbackData === "error") {
      textoRespuesta = "❌ Operación rechazada";
    }

    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: textoRespuesta
    });
  }

  res.sendStatus(200);
});

// Ruta para configurar webhook automáticamente
app.get("/setwebhook", async (req, res) => {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`;
    const webhookUrl = `${BASE_URL}/webhook/${BOT_TOKEN}`;

    const response = await axios.post(url, {
      url: webhookUrl
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Servidor iniciado");
});


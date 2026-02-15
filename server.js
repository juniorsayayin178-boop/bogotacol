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

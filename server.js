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

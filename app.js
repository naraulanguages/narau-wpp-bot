// app.js (CommonJS)
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "narau_token";
const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

if (!token || !phoneNumberId) {
  console.warn("⚠️ ATENÇÃO: defina WHATSAPP_TOKEN e PHONE_NUMBER_ID no .env");
}

/**
 * Envia mensagem de texto simples
 */
async function sendMessage(to, message) {
  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Envia mensagem interativa (botões)
 */
async function sendInteractiveMessage(to) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "Olá, seja bem-vindo à *Narau Languages*! 👋\nComo posso te ajudar?",
          },
          action: {
            buttons: [
              { type: "reply", reply: { id: "info", title: "📘 informações" } },
              { type: "reply", reply: { id: "agendar", title: "🗓️ Aula teste" } },
              { type: "reply", reply: { id: "outros", title: "💬 Outros" } },
            ],
          },
        },
      },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Erro ao enviar mensagem interativa:", err.response?.data || err.message);
    throw err;
  }
}

/**
 * Menu de idiomas (segundo nível)
 */
async function sendLanguageMenu(to) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "Perfeito! Qual idioma você gostaria de aprender? 🌍",
          },
          action: {
            buttons: [
              { type: "reply", reply: { id: "ingles", title: "🇺🇸 Inglês" } },
              { type: "reply", reply: { id: "espanhol", title: "🇪🇸 Espanhol" } },
              { type: "reply", reply: { id: "japones", title: "🇯🇵 Japonês" } },
            ],
          },
        },
      },
      {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Erro ao enviar language menu:", err.response?.data || err.message);
    throw err;
  }
}

const coordenadores = {
  ingles: process.env.COORD_INGLES,
  espanhol: process.env.COORD_ESPANHOL,
  japones: process.env.COORD_JAPONES,
  atendente: process.env.COORD_ATENDENTE,
};

/**
 * Webhook verification (GET) — usado pela Meta para verificar o webhook
 */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * Webhook principal (POST) — Meta envia eventos pra cá
 */
app.post("/webhook", async (req, res) => {
  try {
    const entry = req.body.entry?.[0]?.changes?.[0]?.value;
    const message = entry?.messages?.[0];

    // Se nenhum message (ex: delivery updates), apenas responde 200
    if (!message) return res.sendStatus(200);

    const from = message.from; // número do usuário
    const type = message.type;
    let text = "";

    if (type === "text") text = message.text?.body?.trim();
    else if (type === "interactive") {
      // quando usuário clica um botão, o id vem em button_reply.id
      text = message.interactive?.button_reply?.id;
    }

    console.log(`Mensagem recebida de ${from}:`, text);

    switch (text) {
      case "info":
        await sendMessage(
          from,
          "📘 A Narau Languages oferece aulas com professores nativos, metodologia imersiva e horários flexíveis. Quer que eu envie nosso catálogo?"
        );
        break;

      case "agendar":
        await sendLanguageMenu(from);
        break;

      case "outros":
        await sendMessage(from, "💬 Certo! Encaminhando para um atendente humano. Por favor, aguarde um momento.");
        // Notifica atendente (envia link para conversarem)
        if (coordenadores.atendente) {
          await sendMessage(coordenadores.atendente, `👋 Novo contato para atendimento: https://wa.me/${from}`);
        }
        break;

      case "ingles":
      case "espanhol":
      case "japones":
        await sendMessage(from, "✅ Perfeito! Vou te conectar com o coordenador do curso escolhido.");
        if (coordenadores[text]) {
          await sendMessage(coordenadores[text], `👋 Novo aluno interessado em ${text}. Contato: https://wa.me/${from}`);
        }
        break;

      default:
        // Qualquer mensagem que não seja um id de reply -> exibe o menu principal
        await sendInteractiveMessage(from);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Erro no webhook:", err.response?.data || err.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

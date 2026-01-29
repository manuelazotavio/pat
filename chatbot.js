const qrcode = require("qrcode-terminal");
const { exec } = require("child_process");
const fs = require("fs");
const schedule = require("node-schedule");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const ARQUIVO_VAGAS = "./vagas_caragua.json";
const ARQUIVO_ALERTAS = "./alertas.json";

function carregarJSON(caminho) {
  try {
    if (fs.existsSync(caminho)) {
      return JSON.parse(fs.readFileSync(caminho, "utf8"));
    }
  } catch (e) {
    console.error(`Erro ao ler ${caminho}:`, e);
  }
  return [];
}

function salvarAlerta(numero, termo) {
  let alertas = carregarJSON(ARQUIVO_ALERTAS);
  alertas = alertas.filter(a => !(a.numero === numero && a.termo === termo));
  alertas.push({ numero, termo });
  fs.writeFileSync(ARQUIVO_ALERTAS, JSON.stringify(alertas, null, 2));
}

async function processarComIA(mensagemUsuario, contextoVagas = null) {
  const vagas = contextoVagas || carregarJSON(ARQUIVO_VAGAS);
  
  const prompt = `
    Você é o Assistente Virtual do PAT de Caraguatatuba.
    VAGAS DISPONÍVEIS: ${JSON.stringify(vagas)}

    REGRAS:
    1. Se o usuário quiser cadastrar um alerta (ex: "me avise quando tiver vaga de motorista"), responda APENAS confirmando que entendeu o termo.
    2. Se ele buscar vagas, liste as compatíveis com código e detalhes.
    3. Se não houver vagas, seja gentil.
    4. Endereço: R. Taubaté, 520 - Sumaré.
    
    MENSAGEM: "${mensagemUsuario}"
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    return "Tive um problema técnico, mas tente novamente em instantes!";
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "bot-pat-client",
    dataPath: "/home/ubuntu/pat/.wwebjs_auth",
  }),
  webVersionCache: {
    type: "remote",
    remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
  },
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("Sistema de IA e Alertas Online!"));

client.on("message", async (msg) => {
  if (msg.from === "status@broadcast" || msg.isGroupMsg) return;

  const texto = msg.body.toLowerCase();

  if (texto.includes("me avise") || texto.includes("alerta") || texto.includes("cadastrar")) {
    const termo = texto.replace(/me avise|alerta|quando|tiver|vaga|de|para/g, "").trim();
    if (termo.length > 2) {
      salvarAlerta(msg.from, termo);
      return msg.reply(`✅ Ativado! Vou te avisar assim que surgirem vagas para *${termo}*.`);
    }
  }

  const resposta = await processarComIA(msg.body);
  await msg.reply(resposta);
});

async function dispararAlertasDiarios() {
  const alertas = carregarJSON(ARQUIVO_ALERTAS);
  const vagas = carregarJSON(ARQUIVO_VAGAS);

  for (const alerta of alertas) {
    const promptAlerta = `
      Com base nessas vagas: ${JSON.stringify(vagas)}
      O usuário quer saber de: "${alerta.termo}".
      Se houver vagas, crie uma mensagem de alerta curta e animada. 
      Se não houver NADA, não responda nada, apenas ignore.
    `;

    try {
      const result = await model.generateContent(promptAlerta);
      const txt = result.response.text();
      
      if (txt.length > 10 && !txt.includes("não encontrei") && !txt.includes("desculpe")) {
        await client.sendMessage(alerta.numero, `🔔 *Alerta Diário!*\n\n${txt}`);
      }
    } catch (e) {
      console.error("Erro no disparo:", e);
    }
  }
}

schedule.scheduleJob("50 8 * * *", () => {
  exec("python3 /home/ubuntu/pat/pat_v2.py", (err) => {
    if (!err) console.log("Scraper rodou com sucesso.");
  });
});

schedule.scheduleJob("0 9 * * *", () => dispararAlertasDiarios());

client.initialize();
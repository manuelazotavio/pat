const qrcode = require("qrcode-terminal");
const { exec } = require("child_process");
const fs = require("fs");
const schedule = require("node-schedule");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const ARQUIVO_VAGAS = "./vagas_caragua.json";

function carregarVagas() {
  try {
    if (fs.existsSync(ARQUIVO_VAGAS)) {
      return JSON.parse(fs.readFileSync(ARQUIVO_VAGAS, "utf8"));
    }
    return [];
  } catch (err) {
    console.error("Erro ao ler arquivo de vagas:", err);
    return [];
  }
}

function rodarScraper() {
  console.log("Iniciando scraper...");
  exec("python3 /home/ubuntu/pat/pat_v2.py", (error, stdout, stderr) => {
    if (error) return console.error(`Erro: ${error.message}`);
    console.log(`Scraper rodou: ${stdout}`);
  });
}

async function processarComIA(mensagemUsuario) {
  const vagas = carregarVagas();
  
  const prompt = `
    Você é o Assistente Virtual do PAT de Caraguatatuba.
    Sua missão é ajudar o usuário a encontrar vagas de emprego.

    VAGAS DISPONÍVEIS AGORA:
    ${JSON.stringify(vagas)}

    REGRAS DE RESPOSTA:
    1. Seja humano, empático e use emojis.
    2. Se o usuário procurar uma vaga, liste apenas as que combinam.
    3. Se não houver a vaga exata, sugira algo parecido ou peça para ele tentar outro termo.
    4. Informe sempre o código da vaga e o endereço do PAT (R. Taubaté, 520 - Sumaré).
    5. Se o usuário apenas cumprimentar, explique que você pode buscar vagas pelo nome ou filtrar por requisitos.

    USUÁRIO DISSE: "${mensagemUsuario}"
  `;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Erro Gemini:", error);
    return "Ops, tive um probleminha para processar isso. Pode tentar novamente?";
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
client.on("ready", () => console.log("IA do PAT Online!"));

client.on("message", async (msg) => {
  if (msg.from === "status@broadcast" || msg.isGroupMsg) return;

  try {
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    const resposta = await processarComIA(msg.body);
    await msg.reply(resposta);
  } catch (err) {
    console.error("Erro ao responder:", err);
  }
});

schedule.scheduleJob("50 8 * * *", () => rodarScraper());

client.initialize();
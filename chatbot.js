const qrcode = require("qrcode-terminal");
const { exec } = require("child_process");
const fs = require("fs");
const schedule = require("node-schedule");
const { Client, LocalAuth } = require("whatsapp-web.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const ARQUIVO_ALERTAS = "./alertas.json";
let listaAlertas = [];

try {
  if (fs.existsSync(ARQUIVO_ALERTAS)) {
    listaAlertas = JSON.parse(fs.readFileSync(ARQUIVO_ALERTAS));
  }
} catch (e) {
  console.error(e);
}

function carregarVagasAtualizadas() {
  try {
    const data = fs.readFileSync("./vagas_caragua.json", "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function processarComIA(mensagemUsuario, vagasDisponiveis) {
  const prompt = `
    Você é um assistente simpático do PAT (Posto de Atendimento ao Trabalhador).
    Sua tarefa é ajudar o usuário a encontrar vagas de emprego em uma lista.

    LISTA DE VAGAS ATUAIS (JSON):
    ${JSON.stringify(vagasDisponiveis)}

    MENSAGEM DO USUÁRIO:
    "${mensagemUsuario}"

    INSTRUÇÕES:
    1. Analise a intenção do usuário.
    2. Se ele estiver procurando uma vaga específica, filtre a lista acima e formate uma resposta amigável.
    3. Se não houver vagas que combinem, explique de forma educada e sugira que ele tente outros termos.
    4. Se ele apenas der "Oi", apresente-se como o assistente virtual e pergunte como pode ajudar.
    5. Seja conciso e use emojis.
    6. Informe sempre o código da vaga para que ele possa anotar.
    7. O endereço do PAT é R. Taubaté, 520 - Sumaré, Caraguatatuba.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Erro na IA:", error);
    return "Desculpe, tive um probleminha técnico. Pode repetir?";
  }
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "bot-pat-client",
    dataPath: "/home/ubuntu/pat/.wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  },
});

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));

client.on("ready", () => console.log("IA do PAT conectada e pronta!"));

client.on("message", async (msg) => {
  if (msg.from === "status@broadcast") return;

  try {
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    const vagas = carregarVagasAtualizadas();
    const respostaIA = await processarComIA(msg.body, vagas);

    await msg.reply(respostaIA);

  } catch (err) {
    console.error("Erro ao processar mensagem:", err);
  }
});

client.initialize();
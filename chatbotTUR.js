const qrcode = require("qrcode-terminal");
const { Client } = require("whatsapp-web.js");
const Excel = require("exceljs");

const client = new Client();
const sessions = {};
let guiasCache = [];

async function carregarGuias() {
  const wb = new Excel.Workbook();
  await wb.xlsx.readFile("./guias.xlsx");
  const sheet = wb.worksheets[0];
  const rows = [];

  sheet.eachRow({ includeEmpty: false }, (row, i) => {
    if (i === 1) return; 

    const city = row.getCell(3).text.trim();
    if (city.toLowerCase() !== "caraguatatuba") return;

    rows.push({
      name: row.getCell(4).text.trim(),
      number: row.getCell(5).text.trim(),
      category: row.getCell(12).text.trim(),
      segment: row.getCell(13).text.trim(),
      email: row.getCell(6).text.trim(),
      website: row.getCell(7).text.trim(),
      languages: row.getCell(10).text.trim(),
    });
  });

  guiasCache = rows;
  console.log(`✅ ${rows.length} guias carregados para memória.`);
}

function formatarGuias(lista) {
  if (!lista.length) return "Nenhum guia encontrado.";
  return lista
    .map(
      (g) =>
        `📌 Nome do guia: *${g.name}*\n` +
        `📞 ${g.number}\n` +
        `📂 Segmento: ${g.segment}\n` +
        `E-mail: ${g.email}\n` +
        `Site: ${g.website || "Não informado"}\n` +
        `🗣 Idiomas: ${g.languages}`
    )
    .join("\n\n");
}


function filtrar(guias, { segmento, idioma }) {
  return guias.filter((g) => {
    console.log(segmento);
    console.log(idioma);
    console.log(g);
    if (segmento && !g.segment.toLowerCase().includes(segmento.toLowerCase()))
      return false;
    if (idioma && !g.languages.toLowerCase().includes(idioma.toLowerCase()))
      return false;
    return true;
  });
}

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("📲 WhatsApp conectado."));
client.initialize();


client.on("message", async (msg) => {
  if (msg.body.trim().toLowerCase() === "atualizar guias") {
    await carregarGuias();
    msg.reply("🔄 Lista de guias atualizada com sucesso.");
  }
});

client.on("message", async (msg) => {
  if (!msg.from.endsWith("@c.us")) return;
  const id = msg.from;
  const text = msg.body.trim().toLowerCase();

  if (text.match(/^(menu|guias|oi|olá)$/i)) {
    sessions[id] = { segmento: null, idioma: null };
    await msg.reply(
      "👋 Olá! Seja bem-vindo(a) ao seu assistente do CaraguataTour."
    );
    await msg.reply(
      "Para buscar um guia turístico perfeito para você, escolha um dos segmentos abaixo:\n" +
        "1 - Turismo Cultural\n" +
        "2 - Turismo de Aventura\n" +
        "3 - Turismo de Praia\n" +
        "4 - Turismo Náutico\n" +
        "5 - Ecoturismo\n" +
        "6 - Todos"
    );
    return;
  }

  const sess = sessions[id];
  if (!sess) return;

  if (!sess.segmento) {
    sess.segmento = text;

   if (text === "6" || text.toLowerCase().includes("todos"))
      sess.idioma = "Todos";
    else if (text === "1" || text.includes("Cultural"))
      sess.segmento = "Cultural";
    else if (text === "2" || text.includes("Aventura"))
      sess.segmento = "Aventura";
    else if (text === "3" || text.includes("Praia")) sess.segmento = "Praia";
    else if (text === "4" || text.includes("Náutico"))
      sess.segmento = "Náutico";
    else if (text === "5" || text.includes("Ecoturismo"))
      sess.segmento = "Ecoturismo";
    else {
      await msg.reply(
        "Não entendi. Digite as opções válidas para escolher o segmento."
      );
      return;
    }
    await msg.reply(
      "Beleza! Agora, digite o idioma desejado:\n" +
        "1 - Português\n" +
        "2 - Inglês\n" +
        "3 - Espanhol\n" +
        "4 - Todos"
    );
    return;
  }

  if (!sess.idioma) {
    sess.idioma = text;
    if (text === "4" || text.toLowerCase().includes("todos"))
      sess.idioma = "Todos";
    else if (text === "1" || text.includes("Português"))
      sess.idioma = "Português";
    else if (text === "2" || text.includes("Inglês")) sess.idioma = "Inglês";
    else if (text === "3" || text.includes("Espanhol"))
      sess.idioma = "Espanhol";
    else {
      await msg.reply(
        "Não entendi. Digite as opções válidas para escolher o idioma que o guia fala."
      );
      return;
    }

    const filtro = {
      segmento: sess.segmento === "Todos" ? null : sess.segmento,
      idioma: sess.idioma === "Todos" ? null : sess.idioma,
    };

    const resultado = filtrar(guiasCache, filtro);
    await msg.reply(formatarGuias(resultado));
    delete sessions[id];
  }
});

carregarGuias();

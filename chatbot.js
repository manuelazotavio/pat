const qrcode = require("qrcode-terminal");
const vagas = require("./vagas_caragua.json");
const fs = require("fs");
const schedule = require("node-schedule");

const ARQUIVO_ALERTAS = "./alertas.json";
let listaAlertas = [];

try {
  if (fs.existsSync(ARQUIVO_ALERTAS)) {
    listaAlertas = JSON.parse(fs.readFileSync(ARQUIVO_ALERTAS));
  }
} catch (e) {
  console.error("Erro ao carregar alertas:", e);
}

function salvarAlerta(numero, termo) {
  listaAlertas = listaAlertas.filter(
    (a) => !(a.numero === numero && a.termo === termo)
  );

  listaAlertas.push({ numero, termo });
  fs.writeFileSync(ARQUIVO_ALERTAS, JSON.stringify(listaAlertas, null, 2));
}

const { Client, LocalAuth } = require("whatsapp-web.js");
let vagasAnteriores = [];
try {
  vagasAnteriores = require("./vagas_anterior.json");
} catch (e) {
  console.log(
    "Arquivo de vagas anteriores ainda não existe. Tudo será considerado novo."
  );
}

function filtrarNovas(atuais, antigas) {
  if (!antigas || antigas.length === 0) return atuais;

  return atuais.filter((vagaAtual) => {
    const existia = antigas.some(
      (vagaAntiga) => vagaAntiga.codigo === vagaAtual.codigo
    );
    return !existia;
  });
}

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "bot-pat-client",
    dataPath: "/home/ubuntu/pat/.wwebjs_auth",
  }),
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
    ],
  },
});

const sessions = {};

client.on("qr", (qr) => qrcode.generate(qr, { small: true }));

client.on("authenticated", () => {
  console.log("✅ Autenticado com sucesso! Sessão recuperada/criada.");
});

client.on("auth_failure", (msg) => {
  console.error(
    "❌ Falha na autenticação. Apague a pasta .wwebjs_auth e reinicie.",
    msg
  );
});

client.on("disconnected", (reason) => {
  console.warn("⚠️ O WhatsApp desconectou! Motivo:", reason);
});

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Carregando: ${percent}% - ${message}`);
});

client.on("ready", () => console.log("WhatsApp conectado."));

async function verificarEDispararAlertas() {
  console.log("⏰ Iniciando verificação diária de alertas...");

  const vagasAtualizadas = require("./vagas_caragua.json");

  for (const alerta of listaAlertas) {
    const termo = alerta.termo.toLowerCase();

    const vagasEncontradas = vagasAtualizadas.filter((v) =>
      v.ocupacao.toLowerCase().includes(termo)
    );

    if (vagasEncontradas.length > 0) {
      const msg =
        `🚨 *Alerta de Vaga: ${alerta.termo.toUpperCase()}*\n\n` +
        `Encontrei oportunidades hoje para você!\n\n` +
        formatarVagas(vagasEncontradas);

      try {
        await client.sendMessage(alerta.numero, msg);
        console.log(
          `✅ Alerta enviado para ${alerta.numero} (${alerta.termo})`
        );
        await delay(2000);
      } catch (err) {
        console.error(`Falha ao enviar para ${alerta.numero}:`, err);
      }
    }
  }
  console.log("🏁 Fim do disparo de alertas.");
}

schedule.scheduleJob("0 9 * * *", () => {
  verificarEDispararAlertas();
});

schedule.scheduleJob("0 16 * * *", () => {
  verificarEDispararAlertas();
});

client.initialize();

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function formatarVagas(lista) {
  if (!lista.length)
    return "Nenhuma vaga encontrada para os critérios informados.";
  return lista
    .map(
      (v) =>
        `📌 *${v.ocupacao}*\n` +
        `🔢 Código: ${v.codigo}\n` +
        `📍 Região: ${v.regiao}\n` +
        `🚻 Gênero: ${v.sexo}\n` +
        `💰 Salário: ${v.salario}\n` +
        `📚 Escolaridade: ${v.nivel_instrucao}\n` +
        `⏳ Experiência: ${v.experiencia_meses}\n` +
        `👥 Vagas: ${v.quantidade_vagas}\n` +
        `----------------------`
    )
    .join("\n\n");
}

function filtrar(vagas, { gender, exp, school }) {
  return vagas.filter((v) => {
    if (gender === "M" && !["M", "Masculino", "Ambos"].includes(v.sexo))
      return false;
    if (gender === "F" && !["F", "Feminino", "Ambos"].includes(v.sexo))
      return false;

    if (
      exp === "com" &&
      (v.experiencia_meses === "0" || v.experiencia_meses === "Não exige")
    )
      return false;
    if (
      exp === "sem" &&
      !(v.experiencia_meses === "0" || v.experiencia_meses === "Não exige")
    )
      return false;

    if (school === "com" && v.nivel_instrucao === "Não exige") return false;
    if (school === "sem" && v.nivel_instrucao !== "Não exige") return false;
    return true;
  });
}

function filtrarPorNome(vagas, termo) {
  const termoBusca = termo.toLowerCase();
  return vagas.filter((v) => v.ocupacao.toLowerCase().includes(termoBusca));
}

client.on("message", async (msg) => {
  try {
    if (!msg.from.endsWith("@c.us")) return;

    console.log(
      `📩 [RECEBIDO] De: ${msg.from} | Tipo: ${
        msg.type
      } | Body: ${msg.body.slice(0, 50)}...`
    );
    const id = msg.from;
    const text = msg.body.trim().toLowerCase();
    const sess = sessions[id];

    if (!msg.body) return;

    if (!sess || text === "menu" || text === "oi" || text === "olá") {
      console.log(`👤 [NOVA SESSÃO] Usuário ${id} iniciou conversa.`);
      sessions[id] = {
        search_method: null,
        gender: null,
        exp: null,
        school: null,
      };

      await msg.reply("Bem-vindo ao sistema de busca de vagas do PAT!");
      await msg.reply(
        "Como você gostaria de procurar as vagas?\n\n" +
          "*1* - Filtrar por etapas (gênero, experiência, etc.)\n" +
          '*2* - Pesquisar pelo nome da vaga (ex: "auxiliar")\n' +
          "*3* - Ver todas as vagas disponíveis\n" +
          "*4* - Ver apenas vagas NOVAS.\n" +
          "*5* - Receber alertas diários quando surgir vagas."
      );
      return;
    } else if (!sess.search_method) {
      if (text === "1") {
        sess.search_method = "filter";
        await msg.reply(
          "Ok, vamos filtrar por etapas.\n\n" +
            "Primeiro, escolha o gênero:\n" +
            "1 - Masculinas\n" +
            "2 - Femininas\n" +
            "3 - Ambos"
        );
      } else if (text === "2") {
        sess.search_method = "name";
        await msg.reply(
          "Digite o nome ou termo da vaga que você procura (ex: auxiliar, vendedor, limpeza)."
        );
      } else if (text === "3") {
        const chat = await msg.getChat();
        await chat.sendStateTyping();
        await delay(1000);

        await msg.reply(formatarVagas(vagas));
        await msg.reply(
          "Busca finalizada! Se a vaga que procura estiver na lista, não esqueça:\n" +
            "Leve RG, CPF, currículo e o código da vaga.\n" +
            "Endereço do PAT: R. Taubaté, 520 - Sumaré, Caraguatatuba (08h–16h).\n\n" +
            'Para uma nova busca, digite "menu".'
        );
        delete sessions[id];
      } else if (text === "4") {
        const chat = await msg.getChat();
        await chat.sendStateTyping();
        await delay(1000);

        const novas = filtrarNovas(vagas, vagasAnteriores);

        if (novas.length > 0) {
          await msg.reply(
            `Encontrei *${novas.length}* vagas novas desde a última atualização!`
          );
          await msg.reply(formatarVagas(novas));
        } else {
          await msg.reply(
            "Não há vagas novas em relação à lista anterior. As vagas continuam as mesmas."
          );
        }

        await msg.reply(
          'Para ver a lista completa, digite "menu" e escolha a opção 3.'
        );
        delete sessions[id];
      } else if (text === "5") {
        sess.search_method = "alert";
        await msg.reply(
          "🔔 *Criar Alerta de Vaga*\n\n" +
            "Digite o nome da profissão que você quer receber alertas (ex: Motorista, Recepcionista).\n" +
            "Todo dia de manhã, se houver essa vaga, eu te mando uma mensagem!"
        );
      } else {
        await msg.reply(
          "Opção inválida. Por favor, digite *1*, *2*, *3* ou *4*."
        );
      }
      return;
    } else if (sess.search_method === "filter") {
      if (!sess.gender) {
        if (text === "1" || text === "masculinas") sess.gender = "M";
        else if (text === "2" || text === "femininas") sess.gender = "F";
        else if (text === "3" || text === "ambos") sess.gender = "A";
        else {
          await msg.reply(
            "Não entendi. Digite 1, 2 ou 3 para escolher o gênero."
          );
          return;
        }
        await msg.reply(
          "Legal! Agora, digite 1, 2 ou 3 para filtrar a necessidade de experiência:\n" +
            "1 - Com experiência!\n" +
            "2 - Sem experiência\n" +
            "3 - Ambos"
        );
        return;
      }

      if (!sess.exp) {
        if (text === "1" || text.includes("com exp")) sess.exp = "com";
        else if (text === "2" || text.includes("sem exp")) sess.exp = "sem";
        else if (text === "3" || text.includes("ambos")) sess.exp = "ambos";
        else {
          await msg.reply(
            "Ops, resposta inválida. Digite 1, 2 ou 3 para experiência."
          );
          return;
        }
        await msg.reply(
          "Show! Por fim, digite 1, 2 ou 3 para filtrar a necessidade de escolaridade:\n" +
            "1 - Com escolaridade\n" +
            "2 - Sem escolaridade\n" +
            "3 - Ambos"
        );
        return;
      }

      if (!sess.school) {
        if (text === "1" || text.includes("com esc")) sess.school = "com";
        else if (text === "2" || text.includes("sem esc")) sess.school = "sem";
        else if (text === "3" || text.includes("ambos")) sess.school = "ambos";
        else {
          await msg.reply("Não rolou. Digite 1, 2 ou 3 para escolaridade.");
          return;
        }

        const chat = await msg.getChat();
        await chat.sendStateTyping();
        await delay(1000);

        const filtro = {
          gender: sess.gender === "A" ? null : sess.gender,
          exp: sess.exp === "ambos" ? null : sess.exp,
          school: sess.school === "ambos" ? null : sess.school,
        };
        const resultado = filtrar(vagas, filtro);
        await msg.reply(formatarVagas(resultado));
        await msg.reply(
          "Busca finalizada! Se a vaga que procura estiver na lista, não esqueça:\n" +
            "Leve RG, CPF, currículo e o código da vaga.\n" +
            "Endereço do PAT: R. Taubaté, 520 - Sumaré, Caraguatatuba (08h–16h).\n\n" +
            'Para uma nova busca, digite "menu".'
        );
        delete sessions[id];
      }
    } else if (sess.search_method === "name") {
      const chat = await msg.getChat();
      await chat.sendStateTyping();
      await delay(1000);

      const termoBusca = text;
      const resultado = filtrarPorNome(vagas, termoBusca);

      await msg.reply(formatarVagas(resultado));
      await msg.reply(
        "Busca finalizada! Se a vaga que procura estiver na lista, não esqueça:\n" +
          "Leve RG, CPF, currículo e o código da vaga.\n" +
          "Endereço do PAT: R. Taubaté, 520 - Sumaré, Caraguatatuba (08h–16h).\n\n" +
          'Para uma nova busca, digite "menu".'
      );
      delete sessions[id];
    } else if (sess.search_method === "alert") {
        const termo = text;
        
        salvarAlerta(id, termo);
        
        await msg.reply(`✅ Feito! Criei um alerta para *"${termo}"*.\nAssim que aparecer uma vaga com esse nome na lista diária, eu te aviso.`);
        delete sessions[id];
    }
  } catch (err) {
    console.error(`❌ ERRO FATAL ao processar msg de ${msg.from}:`, err);
  }
});

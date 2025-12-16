const qrcode = require("qrcode-terminal");
const vagas = require("./vagas_caragua.json");
const { Client } = require("whatsapp-web.js");


const client = new Client({
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});


const sessions = {};


client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("WhatsApp conectado."));
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
  if (!msg.from.endsWith("@c.us")) return; 
  const id = msg.from;
  const text = msg.body.trim().toLowerCase();
  const sess = sessions[id];


  if (!sess || text === "menu") {
    sessions[id] = { search_method: null, gender: null, exp: null, school: null };

    await msg.reply("Bem-vindo ao sistema de busca de vagas do PAT!");
    await msg.reply(
      "Como você gostaria de procurar as vagas?\n\n" +
        "*1* - Filtrar por etapas (gênero, experiência, etc.)\n" +
        '*2* - Pesquisar pelo nome da vaga (ex: "auxiliar")\n' +
        "*3* - Ver todas as vagas disponíveis"
    );
    return; 
  }


  else if (!sess.search_method) {
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
    } else {
      await msg.reply(
        "Opção inválida. Por favor, digite *1*, *2* ou *3*."
      );
    }
    return;
  }


  else if (sess.search_method === "filter") {

    if (!sess.gender) {
      if (text === "1" || text === "masculinas") sess.gender = "M";
      else if (text === "2" || text === "femininas") sess.gender = "F";
      else if (text === "3" || text === "ambos") sess.gender = "A";
      else {
        await msg.reply("Não entendi. Digite 1, 2 ou 3 para escolher o gênero.");
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
        await msg.reply("Ops, resposta inválida. Digite 1, 2 ou 3 para experiência.");
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
  }

  
  else if (sess.search_method === "name") {
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
  }
});

const qrcode = require('qrcode-terminal');
const vagas = require('./vagas_caragua.json');
const { Client } = require('whatsapp-web.js');
const client = new Client();

const sessions = {}; // armazena estado de cada usuário

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('WhatsApp conectado.'));
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms));

function formatarVagas(lista) {
    if (!lista.length) return 'Nenhuma vaga encontrada.';
    return lista.map(v => 
        `📌 *${v.ocupacao}*\n` +
        `🔢 Código: ${v.codigo}\n` +
        `📍 Região: ${v.regiao}\n` +
        `🚻 Gênero: ${v.sexo}\n` +
        `💰 Salário: ${v.salario}\n` +
        `📚 Escolaridade: ${v.nivel_instrucao}\n` +
        `⏳ Experiência: ${v.experiencia_meses}\n` +
        `👥 Vagas: ${v.quantidade_vagas}\n` +
        `----------------------`
    ).join('\n\n');
}

function filtrar(vagas, { gender, exp, school }) {
    return vagas.filter(v => {
        // gênero
        if (gender === 'M' && !['M','Masculino','Ambos'].includes(v.sexo)) return false;
        if (gender === 'F' && !['F','Feminino','Ambos'].includes(v.sexo)) return false;
        // experiência
        if (exp === 'com' && (v.experiencia_meses === '0' || v.experiencia_meses === 'Não exige')) return false;
        if (exp === 'sem' && !(v.experiencia_meses === '0' || v.experiencia_meses === 'Não exige')) return false;
        // escolaridade
        if (school === 'com' && v.nivel_instrucao === 'Não exige') return false;
        if (school === 'sem' && v.nivel_instrucao !== 'Não exige') return false;
        return true;
    });
}

client.on('message', async msg => {
    if (!msg.from.endsWith('@c.us')) return;
    const id = msg.from;
    const text = msg.body.trim().toLowerCase();

    // resetar sessão a qualquer hora que mandar "menu"
    if (text.match(/^(menu|vagas|oi|olá)$/i)) {
        sessions[id] = { gender: null, exp: null, school: null };
        await msg.reply(
            '👋 Olá! Para visualizar as vagas, primeiro, escolha o gênero:\n' +
            '1 - Masculinas\n' +
            '2 - Femininas\n' +
            '3 - Ambos'
        );
        return;
    }

    const sess = sessions[id];
    if (!sess) return; // se não tiver sessão iniciada, ignora

    // passo 1: gênero
    if (!sess.gender) {
        if (text === '1' || text === 'masculinas') sess.gender = 'M';
        else if (text === '2' || text === 'femininas') sess.gender = 'F';
        else if (text === '3' || text === 'ambos') sess.gender = 'A';
        else {
            await msg.reply('Não entendi. Digite 1, 2 ou 3 para escolher o gênero.');
            return;
        }
        await msg.reply(
            'Legal! Agora, digite 1, 2 ou 3 para filtrar a necessidade de experiência:\n' +
            '1 - Com experiência\n' +
            '2 - Sem experiência\n' +
            '3 - Ambos'
        );
        return;
    }

    // passo 2: experiência
    if (!sess.exp) {
        if (text === '1' || text.includes('com exp')) sess.exp = 'com';
        else if (text === '2' || text.includes('sem exp')) sess.exp = 'sem';
        else if (text === '3' || text.includes('ambos')) sess.exp = 'ambos';
        else {
            await msg.reply('Ops, resposta inválida. Digite 1, 2 ou 3 para experiência.');
            return;
        }
        await msg.reply(
            'Show! Por fim, digite 1, 2 ou 3 para filtrar a necessidade de escolaridade:\n' +
            '1 - Com escolaridade\n' +
            '2 - Sem escolaridade\n' +
            '3 - Ambos'
        );
        return;
    }

    // passo 3: escolaridade + resposta final
    if (!sess.school) {
        if (text === '1' || text.includes('com esc')) sess.school = 'com';
        else if (text === '2' || text.includes('sem esc')) sess.school = 'sem';
        else if (text === '3' || text.includes('ambos')) sess.school = 'ambos';
        else {
            await msg.reply('Não rolou. Digite 1, 2 ou 3 para escolaridade.');
            return;
        }

        // já tenho gender, exp e school: filtra e responde
        const filtro = {
            gender: sess.gender === 'A' ? null : sess.gender,
            exp: sess.exp === 'ambos' ? null : sess.exp,
            school: sess.school === 'ambos' ? null : sess.school
        };
        const resultado = filtrar(vagas, filtro);
        await msg.reply(formatarVagas(resultado));
        await msg.reply(
            'Não esqueça: leve RG, CPF, currículo e o código da vaga.\n' +
            'Endereço do PAT: R. Taubaté, 520 - Sumaré, Caraguatatuba (08h–16h).'
        );
        // limpa sessão para próxima pesquisa
        delete sessions[id];
    }
});

const qrcode = require('qrcode-terminal');
const { Client } = require('whatsapp-web.js');
const Excel = require('exceljs');

const client = new Client();
const sessions = {};
let guiasCache = [];


async function carregarGuias() {
    const wb = new Excel.Workbook();
    await wb.xlsx.readFile('./guias.xlsx');
    const sheet = wb.worksheets[0];
    const rows = [];

    sheet.eachRow({ includeEmpty: false }, (row, i) => {
        if (i === 1) return; // cabeçalho

        const city = row.getCell(3).text.trim();
        if (city.toLowerCase() !== "caraguatatuba") return;

        rows.push({
            name:        row.getCell(4).text.trim(),
            number:      row.getCell(5).text.trim(),
            category:    row.getCell(12).text.trim(),
            segment:     row.getCell(13).text.trim(),
            email:       row.getCell(6).text.trim(),
            website:     row.getCell(7).text.trim(),
            languages:   row.getCell(10).text.trim()
        });
    });

    guiasCache = rows;
    console.log(`✅ ${rows.length} guias carregados para memória.`);
}

// Formata pro WhatsApp
function formatarGuias(lista) {
    if (!lista.length) return 'Nenhum guia encontrado.';
    return lista.map(g =>
        `📌 *${g.name}*\n` +
        `📞 ${g.number}\n` +
        `📂 Segmento: ${g.segment}\n` +
        `📧 ${g.email}\n` +
        `🌐 ${g.website || 'Não informado'}\n` +
        `🗣 Idiomas: ${g.languages}`
    ).join('\n\n');
}

// Filtra os guias
function filtrar(guias, { segmento, idioma }) {
    return guias.filter(g => {
        if (segmento && g.segment.toLowerCase().includes(segmento.toLowerCase())) return false;
        if (idioma && !g.languages.toLowerCase().includes(idioma.toLowerCase())) return false;
        return true;
    });
}

// QR e inicialização
client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('📲 WhatsApp conectado.'));
client.initialize();

// Comando pra recarregar planilha manualmente
client.on('message', async msg => {
    if (msg.body.trim().toLowerCase() === 'atualizar guias') {
        await carregarGuias();
        msg.reply('🔄 Lista de guias atualizada com sucesso.');
    }
});

// Fluxo do chatbot
client.on('message', async msg => {
    if (!msg.from.endsWith('@c.us')) return;
    const id = msg.from;
    const text = msg.body.trim().toLowerCase();

    if (text.match(/^(menu|guias|oi|olá)$/i)) {
        sessions[id] = { segmento: null, idioma: null };
        await msg.reply('👋 Qual o segmento desejado? Ecoturismo, cultural, náutico, aventura, praia ou "todos".');
        return;
    }

    const sess = sessions[id];
    if (!sess) return;

    if (!sess.segmento) {
        sess.segmento = (text === 'todos') ? null : text;
        await msg.reply('Beleza! Agora, digite o idioma desejado: Inglês, espanhol, português, ou "todos".');
        return;
    }

    if (!sess.idioma) {
        sess.idioma = (text === 'todos') ? null : text;
        const resultado = filtrar(guiasCache, sess);
        await msg.reply(formatarGuias(resultado));
        delete sessions[id];
    }
});

// Carrega planilha antes de iniciar
carregarGuias();

// leitor de qr code
const qrcode = require('qrcode-terminal');
const vagas = require('./vagas_caragua.json');
const { Client, Buttons, List, MessageMedia } = require('whatsapp-web.js'); // Mudança Buttons
const client = new Client();
// serviço de leitura do qr code
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});
// apos isso ele diz que foi tudo certo
client.on('ready', () => {
    console.log('Tudo certo! WhatsApp conectado.');
});
// E inicializa tudo 
client.initialize();

const delay = ms => new Promise(res => setTimeout(res, ms)); // Função que usamos para criar o delay entre uma ação e outra

// Todas as vagas
function listarTodas() {
    return formatarVagas(vagas);
}

// Vagas masculinas
function vagasMasculinas() {
    const resultado = vagas.filter(vaga => vaga.sexo === 'M' || vaga.sexo === 'Masculino' || vaga.sexo === 'Ambos');
    return formatarVagas(resultado);
}

// Vagas femininas
function vagasFemininas() {
    const resultado = vagas.filter(vaga => vaga.sexo === 'F' || vaga.sexo === 'Feminino' || vaga.sexo === 'Ambos');
    return formatarVagas(resultado);
}

// Sem experiência
function vagasSemExperiencia() {
    const resultado = vagas.filter(vaga => vaga.experiencia_meses === '0' || vaga.experiencia_meses === 'Não exige');
    return formatarVagas(resultado);
}

// Sem escolaridade
function vagasSemEscolaridade() {
    const resultado = vagas.filter(vaga => vaga.nivel_instrucao === 'Não exige');
    return formatarVagas(resultado);
}

function formatarVagas(lista) {
    if (lista.length === 0) {
        return 'Nenhuma vaga encontrada.';
    }

    return lista.map(vaga => 
        `📌 *${vaga.ocupacao}*\n` +
        `🔢 Código: ${vaga.codigo}\n` +
        `📍 Região: ${vaga.regiao}\n` +
        `📍 Gênero: ${vaga.sexo}\n` +
        `💰 Salário: ${vaga.salario}\n` +
        `📚 Escolaridade: ${vaga.nivel_instrucao}\n` +
        `⏳ Experiência: ${vaga.experiencia_meses}\n` +
        `📍 Região: ${vaga.regiao}\n` +
        `👥 Quantidade: ${vaga.quantidade_vagas}\n` +
        `----------------------`
    ).join('\n\n');
}



// Funil

client.on('message', async msg => {

    if (msg.body.match(/(menu|Menu|dia|tarde|noite|oi|Oi|Olá|olá|ola|Ola|vagas|vaga|emprego|buscar)/i) && msg.from.endsWith('@c.us')) {

        const chat = await msg.getChat();

        await delay(2000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(2000); //Delay de 3000 milisegundos mais conhecido como 3 segundos
        const contact = await msg.getContact(); //Pegando o contato
        const name = contact.pushname; //Pegando o nome do contato
        await client.sendMessage(msg.from, 'Olá ' + name.split(" ")[0] + ', para ver as vagas do PAT de hoje, digite uma das opções abaixo:\n\n1 - TODAS\n2 - MASCULINAS \n3 - FEMININAS\n4 - SEM EXPERIENCIA\n5 - SEM ESCOLARIDADE'); //Primeira mensagem de texto
        await delay(3000); //delay de 3 segundos
    }

    if (msg.body !== null && msg.body === '1' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const resposta = listarTodas();

        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, resposta);

        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await client.sendMessage(msg.from, 'Lembre-se de levar seu RG, CPF, currículo atualizado e o código da vaga pretendida. \n Endereço do PAT: 📌 R. Taubaté, 520 - Sumaré, Caraguatatuba. \n 🕗 08h às 16h.');
        await client.sendMessage(msg.from, 'Para ver as vagas do PAT de hoje, digite uma das opções abaixo:\n\n1 - TODAS\n2 - MASCULINAS \n3 - FEMININAS\n4 - SEM EXPERIENCIA\n5 - SEM ESCOLARIDADE');
        await delay(3000);
    }

    if (msg.body !== null && msg.body === '2' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
         const resposta = vagasMasculinas();

        await delay(3000); //Delay de 3000 milisegundos mais conhecido como 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, resposta);

        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, 'Lembre-se de levar seu RG, CPF, currículo atualizado e o código da vaga pretendida. \n Endereço do PAT: 📌 R. Taubaté, 520 - Sumaré, Caraguatatuba. \n 🕗 08h às 16h.');
        await client.sendMessage(msg.from, 'Para ver as vagas do PAT de hoje, digite uma das opções abaixo:\n\n1 - TODAS\n2 - MASCULINAS \n3 - FEMININAS\n4 - SEM EXPERIENCIA\n5 - SEM ESCOLARIDADE');
    }

    if (msg.body !== null && msg.body === '3' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const resposta = vagasFemininas()

        await delay(3000); //Delay de 3000 milisegundos mais conhecido como 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, resposta);

        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, 'Lembre-se de levar seu RG, CPF, currículo atualizado e o código da vaga pretendida. \n Endereço do PAT: 📌 R. Taubaté, 520 - Sumaré, Caraguatatuba. \n 🕗 08h às 16h.');
        await client.sendMessage(msg.from, 'Para ver as vagas do PAT de hoje, digite uma das opções abaixo:\n\n1 - TODAS\n2 - MASCULINAS \n3 - FEMININAS\n4 - SEM EXPERIENCIA\n5 - SEM ESCOLARIDADE');

    }

    if (msg.body !== null && msg.body === '4' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const resposta = vagasSemExperiencia()
        await delay(3000); //Delay de 3000 milisegundos mais conhecido como 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, resposta);


        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, 'Lembre-se de levar seu RG, CPF, currículo atualizado e o código da vaga pretendida. \n Endereço do PAT: 📌 R. Taubaté, 520 - Sumaré, Caraguatatuba. \n 🕗 08h às 16h.');
        await client.sendMessage(msg.from, 'Para ver as vagas do PAT de hoje, digite uma das opções abaixo:\n\n1 - TODAS\n2 - MASCULINAS \n3 - FEMININAS\n4 - SEM EXPERIENCIA\n5 - SEM ESCOLARIDADE');


    }

    if (msg.body !== null && msg.body === '5' && msg.from.endsWith('@c.us')) {
        const chat = await msg.getChat();
        const resposta = vagasSemEscolaridade()

        await delay(3000); //Delay de 3000 milisegundos mais conhecido como 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, resposta);


        await delay(3000); //delay de 3 segundos
        await chat.sendStateTyping(); // Simulando Digitação
        await delay(3000);
        await client.sendMessage(msg.from, 'Lembre-se de levar seu RG, CPF, currículo atualizado e o código da vaga pretendida. \n Endereço do PAT: 📌 R. Taubaté, 520 - Sumaré, Caraguatatuba. \n 🕗 08h às 16h.');
        await client.sendMessage(msg.from, 'Para ver as vagas do PAT de hoje, digite uma das opções abaixo:\n\n1 - TODAS\n2 - MASCULINAS \n3 - FEMININAS\n4 - SEM EXPERIENCIA\n5 - SEM ESCOLARIDADE');
    }
});
# Bot de Vagas do PAT - Caraguatatuba

![Status](https://img.shields.io/badge/Status-Online-green)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?logo=node.js)
![Python](https://img.shields.io/badge/Python-3.10+-blue?logo=python)
![AWS](https://img.shields.io/badge/Deploy-AWS_EC2-orange?logo=amazon-aws)

> Um assistente virtual inteligente que automatiza a busca e distribuição de vagas de emprego do Posto de Atendimento ao Trabalhador (PAT) de Caraguatatuba via WhatsApp.

## Teste aqui: 
> https://api.whatsapp.com/send/?phone=5512991059135&text=menu&type=phone_number&app_absent=0

---

## 📖 Sobre o projeto

Eu sei que procurar emprego é uma tarefa chata. Ainda mais se, para isso, é preciso acessar o mesmo site todos os dias e procurar em uma lista extensa de vagas, sem nenhum tipo de filtro.

Esse projeto resolve a dificuldade de acesso rápido às vagas de emprego locais. O sistema opera em dois estágios:

1. **Coleta de dados:** Um script em Python varre o site oficial do PAT diariamente, trata os dados e salva em formato JSON.
2. **Chatbot:** Um servidor Node.js gerencia as interações via WhatsApp, permitindo filtros avançados, buscas por nome e sistema de alertas automáticos.

O projeto está hospedado em uma instância **AWS EC2**, com deploy automatizado via **GitHub Actions**.

---

## Funcionalidades principais

### Para o usuário
* **Menu interativo:** Navegação simples por números.
* **Filtros inteligentes:** Busque vagas por Gênero, Experiência e Escolaridade.
* **Busca por palavra-chave:** Digite "Motorista" e veja apenas as vagas compatíveis.
* **Vagas recentes:** Algoritmo que compara o arquivo do dia anterior com o atual e exibe apenas as novas oportunidades.
* **Sistema de alertas:** O usuário cadastra um termo (ex: "Cozinheira") e o bot envia uma notificação ativa automaticamente assim que a vaga surge no sistema (Job agendado).

### Para o administrador
* **Log de auditoria:** Monitoramento em tempo real de quem envia mensagens e o que está sendo buscado.
* **Rotação de arquivos:** Backup automático do histórico de vagas (`vagas_anterior.json`).
* **Resiliência:** Tratamento de erros, reconexão automática e persistência de sessão.

---

## Tecnologias Utilizadas

* **Backend:** Node.js, `whatsapp-web.js`, `node-schedule`.
* **Scraper:** Python, Selenium WebDriver.
* **Infraestrutura:** AWS EC2 (Ubuntu), PM2 (Gerenciador de Processos), Swap Memory configurada.
* **DevOps:** Git, GitHub Actions.
* **Banco de Dados:** JSON (pelo baixo custo).

---

## 📂 Estrutura do projeto

```bash
/pat
│── .github/workflows/    # Scripts de CI/CD 
│── .wwebjs_auth/         # Sessão criptografada do WhatsApp
│── alertas.json          # Banco de dados de usuários inscritos nos alertas
│── chatbot.js            # Código principal do bot 
│── pat_v2.py             # Script de Web Scraping 
│── vagas_caragua.json    # Base atual de vagas
│── vagas_anterior.json   # Histórico para comparação
└── package.json          # Dependências do projeto
```

---

## Como rodar localmente

### Pré-requisitos
* Node.js instalado.
* Python 3 instalado.
* Google Chrome instalado.

### 1. Clonar e instalar

```bash
git clone [https://github.com/manuelazotavio/pat.git](https://github.com/manuelazotavio/pat.git)
cd pat

# Instalar dependências do Node
npm install

# Instalar dependências do Python
pip install selenium
```

### 2. Gerar a base de dados
Execute o script para baixar as vagas do site oficial:

```bash
python3 pat_v2.py
# Isso criará o arquivo vagas_caragua.json
```

### 3. Iniciar o Bot

```bash
node chatbot.js
```
*Escaneie o QR Code que aparecerá no terminal com o seu WhatsApp.*

---

## ☁️ Deploy e automação na AWS

O projeto roda em produção utilizando **PM2** para manter o processo vivo 24/7 e reiniciar em caso de falhas.

Comandos úteis do servidor:

```bash
# Ver logs em tempo real
pm2 logs bot-pat

# Reiniciar o serviço
pm2 restart bot-pat

# Monitorar uso de CPU/Memória
pm2 monit
```

---

## 👩‍💻 Autora

**Manuela Otavio da Silva**

* Desenvolvedora Full Stack.
* Estudante de ADS e Pesquisadora.

Feito com 💜.
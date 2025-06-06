from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys
import json
import time

numero = "5511942881397"

def tratar_vagas(vagas):
    vagas_tratadas = []
    for vaga in vagas:
        vaga_tratada = {
            "codigo": vaga.get('Código da vaga'),
            "ocupacao": vaga.get('Ocupação'),
            "quantidade_vagas": int(vaga.get('Nº Vagas')) if vaga.get('Nº Vagas').isdigit() else vaga.get('Nº Vagas'),
            "nivel_instrucao": vaga.get('Nível de instrução').replace('—–', 'Não exige').strip() or None,
            "experiencia_meses": f"{int(vaga.get('Exige experiência (em meses)').replace('—–', 'Não exige').strip())} meses" if vaga.get('Exige experiência (em meses)').replace('—–', 'Não exige').strip().isdigit() and int(vaga.get('Exige experiência (em meses)').replace('—–', 'Não exige').strip()) > 0 else "Não exige",
            "regiao": vaga.get('Região').replace('—–', 'Não especificada').strip() or None,
            "sexo": vaga.get('Sexo').replace('—', 'Ambos').strip() or None,
            "salario": vaga.get('Salário')
        }
        vagas_tratadas.append(vaga_tratada)
    return vagas_tratadas

options = webdriver.ChromeOptions()

options.add_argument(r"user-data-dir=C:\Users\Manuela Otavio\AppData\Local\Google\Chrome\User Data\SeleniumProfile")

service = Service()
driver = webdriver.Chrome(service = service, options = options)



url = "https://www.caraguatatuba.sp.gov.br/pmc/2025/06/vagas-disponiveis/"

driver.get(url)

time.sleep(2)

tabela = driver.find_element(By.TAG_NAME, "table")

linhas = tabela.find_elements(By.TAG_NAME, "tr")

cabecalhos = [cabeca.text.strip() for cabeca in linhas[0].find_elements(By.TAG_NAME, "strong")]

vagas = []

for linha in linhas[1:]:
    colunas = linha.find_elements(By.TAG_NAME, "td")
    if colunas:
        dados = [coluna.text.strip() for coluna in colunas]
        vaga = dict(zip(cabecalhos, dados))
        vagas.append(vaga)

vagas_formatadas = tratar_vagas(vagas)

mensagens = []
for vaga in vagas_formatadas:
    mensagem = (
        f" *Vaga:* {vaga['ocupacao']}"
        f" *Código:* {vaga['codigo']}"
        f" *Quantidade:* {vaga['quantidade_vagas']}"
        f" *Escolaridade:* {vaga['nivel_instrucao']}"
        f" *Experiência:* {vaga['experiencia_meses']}"
        f" *Região:* {vaga['regiao']}"
        f" *Sexo:* {vaga['sexo']}"
        f" *Salário:* {vaga['salario']}"
    )
    mensagens.append(mensagem)

print(vagas)

print(json.dumps(vagas_formatadas, indent=4, ensure_ascii=False))

with open('vagas_caragua.json', 'w', encoding='utf-8') as f:
    json.dump(vagas_formatadas, f, ensure_ascii=False, indent=4)

driver.get("https://web.whatsapp.com")

time.sleep(15)
search_box = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]')
search_box.click()
search_box.send_keys(numero)
time.sleep(2) 

search_box.send_keys(Keys.ENTER)
time.sleep(3)

for mensagem in mensagens:
    caixa_msg = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]')
    caixa_msg.click()
    caixa_msg.send_keys(mensagem)
    caixa_msg.send_keys(Keys.ENTER)
    time.sleep(1)  # espera pra não travar

print("Mensagens enviadas!")

driver.quit()


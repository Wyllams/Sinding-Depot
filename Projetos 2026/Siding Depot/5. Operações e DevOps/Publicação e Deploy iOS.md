---
tags:
  - deploy
  - ios
  - app-store
  - operations
  - devops
created: 2026-04-18
---

# 🚀 Publicação e Deploy iOS (App Store)

> Voltar para [[Siding Depot — Índice]] | Ver também [[Arquitetura Técnica]]

Este documento define o processo oficial e a divisão de tarefas para a publicação do **Field App** e **Customer Portal** nas lojas de aplicativos, convertendo o Next.js / React em um App Nativo via **CapacitorJS**.

---

## 🎯 Resumo da Estratégia de Negócio

Para estar de acordo com a [Diretriz 4.2.6 da Apple](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality), a prestadora de serviços (Siding Depot) **deve ser legalmente a proprietária da conta do aplicativo**.

- **Cliente (Dono do Negócio):** Detém a conta oficial, paga a anuidade da Apple e assume a responsabilidade da marca.
- **Desenvolvedor:** Domina a tecnologia, gerencia a esteira automatizada no GitHub (Deploy) e atua sob o painel da empresa hospedada.

---

## 🏢 Passo a Passo para o CLIENTE (Dono do Negócio)

O cliente precisará realizar as seguintes configurações burocráticas (Tempo estimado: 30 a 60 minutos dependendo da aprovação da Apple):

1. **Número D-U-N-S:** 
   Como a Siding Depot é uma LLC, a Apple exige o número D-U-N-S (gratuito) para validar que é uma empresa real americana. O cliente pode checar ou solicitar em [developer.apple.com/enroll/duns-lookup/](https://developer.apple.com/enroll/duns-lookup/).
2. **Criar a Conta de Desenvolvedor:**
   - Acessar o site [Apple Developer Programs](https://developer.apple.com/programs/).
   - Clicar em **Enroll** e fazer login com o Apple ID do dono da empresa.
   - Escolher a inscrição como **"Company / Organization"** (nunca Individual, senão o nome dele aparecerá na App Store ao invés do nome da empresa).
   - Preencher os dados corporativos e fazer o pagamento da assinatura anual de **US$ 99**.
3. **Dar Acesso ao Desenvolvedor:**
   - Após a conta no Apple Developer estar 100% aprovada, o cliente entra em [App Store Connect](https://appstoreconnect.apple.com).
   - Navegar até **Users and Access (Usuários e Acesso)**.
   - Clicar no botão `+` e convidar o **e-mail do Desenvolvedor** escolhendo a função de **"Admin"**.

A partir desse ponto, o cliente não precisa mexer em absolutamente mais nada.

---

## 👨‍💻 Passo a Passo para o DESENVOLVEDOR (Setup Técnico)

Sua missão é envelopar a aplicação Next.js utilizando CapacitorJS e criar o canhão de envio com o GitHub Actions.

### 1. Instalação e Preparação do Ambiente
No diretório `web` do projeto, rode os comandos para instalar o Capacitor:
```bash
npm install @capacitor/core @capacitor/ios
npm install @capacitor/cli --save-dev
```

### 2. Configurar o Next.js para Exportação Estática
No arquivo `next.config.js`, force o Next a exportar um HTML que possa rodar offline sem precisar de um servidor Node.js ativo:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true }, // Importante: O iOS WebView não lida bem com a otimização automática de imagens do Vercel
};
module.exports = nextConfig;
```

### 3. Iniciar o Capacitor
```bash
npx cap init "Siding Depot" "com.sidingdepot.app" --web-dir out
```
Isso cria um arquivo `capacitor.config.json` ou `.ts` na raiz do seu projeto. O diretório apontado deve ser a pasta gerada pelo export do Next (neste caso, `out` ou similar dependendo da sua versão. No Next.js 14 costuma gerar numa pasta customizada, certifique-se de qual é).

### 4. Compilar e Adicionar Projeto Nativo iOS
```bash
npm run build     # Ou o comando que for construir e exportar os arquivos web
npx cap add ios   # Cria a pasta nativa /ios do Xcode
npx cap sync ios  # Copia os arquivos mais recentes da web para dentro do iOS
```

### 5. Configurar Pipeline Automatizada (GitHub Actions Gratuito)
Crie o certificado API Key de distribuição lá no portal da Apple (App Store Connect). Depois, configure uma esteira `.github/workflows/ios.yml` para rodar algo assim sempre que você fizer um commit na branch "producao":
- Usar uma máquina `runs-on: macos-latest`.
- Fazer o checkout do código.
- Instalar Node e Capacitor.
- Rodar o plugin Fastlane (ou ferramenta equivalente suportada na action) para injetar o certificado e subir o pacote (`.ipa`) magicamente para a aba de testes do *TestFlight* do cliente via linha de comando.

> [!tip] 
> Sempre teste o código inteiro via **Apple TestFlight** primeiro antes de "bater o martelo" para a aprovação final da Store, enviando convites para os telefones do Cliente e da primeira Equipe Piloto (Crew principal) fazerem testes de campo.

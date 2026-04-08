# SelfHealthy

Aplicacao web com autenticacao, cadastro de usuarios e um chat de apoio emocional integrado a OpenAI via LangChain. O backend usa Express + MongoDB e renderiza paginas EJS.

## Stack
- Node.js + Express
- MongoDB (Mongoose)
- EJS (views)
- LangChain + OpenAI

## Requisitos
- Node.js 18+ (recomendado)
- MongoDB (Atlas ou local)

## Configuracao local
1. Instale dependencias:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` na raiz com as variaveis abaixo:

   ```env
   MONGODB_URI=...
   OPENAI_API_KEY=...
   SESSION_SECRET=...
   ```

3. Inicie o servidor local:

   ```bash
   npm start
   ```

A aplicacao sobe por padrao em `http://localhost:3000`.

## Scripts
- `npm start`: inicia o servidor local (entrada em `javascript/local.js`).

## Principais rotas
- `GET /`: pagina inicial
- `GET /cadastro`: formulario de cadastro
- `GET /login`: login
- `POST /enviar`: cria usuario
- `POST /login`: autentica usuario
- `GET /pagina_principal`: area logada
- `POST /api/chat`: chat (requer login)
- `GET /__health`: healthcheck

## Deploy na Vercel
Este projeto esta preparado para Vercel usando `api/index.js` como funcao serverless e `vercel.json` com rewrites. Certifique-se de configurar as variaveis de ambiente (`MONGODB_URI`, `OPENAI_API_KEY`, `SESSION_SECRET`) no painel da Vercel.

## Estrutura de pastas (resumo)
- `javascript/server.js`: servidor Express e rotas
- `javascript/local.js`: bootstrap local
- `api/index.js`: handler para Vercel
- `views/`: templates EJS
- `css/`, `imgs/`, `javascript/`: assets estaticos

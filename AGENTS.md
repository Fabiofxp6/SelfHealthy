# AGENTS.md

## Overview

SelfHealthy is a Node.js web application built with Express and EJS. It serves public pages, supports user registration and login with MongoDB, and exposes a protected AI chat powered by OpenAI through LangChain.

Primary language for UI and user-facing copy is Brazilian Portuguese.

## Stack

- Node.js
- Express
- EJS templates
- MongoDB with Mongoose
- `express-session` for auth state
- `bcryptjs` for password hashing
- LangChain + OpenAI for chat

## Repository Map

- `javascript/server.js`: main Express app, routes, auth/session setup, MongoDB connection, chat endpoint
- `javascript/local.js`: local runtime entrypoint, calls `startServer()`
- `api/index.js`: serverless adapter that imports the same Express app
- `views/`: EJS pages and partials
- `javascript/`: browser-side scripts such as login, signup, and chat behavior
- `css/style.css`: main stylesheet
- `imgs/`: static assets
- `README.md`: deployment and environment documentation
- `requirements.txt`: legacy file, not part of the Node runtime

## How To Run

1. Install dependencies:

```bash
npm install
```

2. Create `.env` with at least:

```env
MONGODB_URI=...
OPENAI_API_KEY=...
SESSION_SECRET=...
PORT=3000
NODE_ENV=development
```

3. Start the app:

```bash
npm start
```

Local entrypoint is `javascript/local.js`. Default URL is `http://localhost:3000`.

## Core Behavior

### Routing

Important routes in `javascript/server.js`:

- `GET /`: landing page
- `GET /cadastro`: registration page
- `POST /enviar`: create account
- `GET /login`: login page
- `POST /login`: authenticate user
- `GET /pagina_principal`: protected chat page
- `POST /api/chat`: protected AI chat endpoint
- `GET /logout`: destroy session
- `GET /__health`: lightweight health endpoint

### Authentication

- Auth is session-based via `express-session`
- Session cookie name is `selfhealthy.sid`
- Protected pages use `requireAuth`
- Sessions are stored in memory only

Implication: do not assume horizontal scalability or persistence across restarts without changing the session store.

### Database

- MongoDB connection is initialized through `connectToDatabase()`
- User model is defined inline in `javascript/server.js`
- `MONGODB_URI` is required at startup

Implication: if you touch user persistence, keep schema, validation, and duplicate-email handling aligned with the current flow.

### AI Chat

- `/api/chat` requires an authenticated session
- Chat uses `@langchain/openai` with `ChatOpenAI`
- Model is currently `gpt-4.1`
- Per-user conversation history is held in memory in `chatSessions`
- Chat responses are streamed as plain text chunks

Implication: chat history is ephemeral and lost on process restart. Preserve streaming behavior unless there is a deliberate product change.

## Conventions For Future Changes

- Keep UI text in Portuguese unless a task explicitly requires another language.
- Preserve existing server-side rendering with EJS unless a migration is requested.
- Reuse the existing Express app exported from `javascript/server.js` when changing runtime behavior.
- Prefer small, targeted changes over framework rewrites.
- If adding new protected routes, use `requireAuth`.
- If adding auth-sensitive POST routes, consider whether they need rate limiting similar to `authLimiter` or `chatLimiter`.
- Do not hardcode secrets or sample production credentials anywhere in the repo.

## Areas That Need Extra Care

- `.env` exists in the repository root. Never commit real secrets or echo them in logs.
- `SESSION_SECRET` currently falls back to a development default. Avoid relying on that fallback outside local dev.
- Session state and chat history are memory-backed. Changes that add production load should account for this.
- `api/index.js` and `javascript/local.js` are two entrypaths into the same app. Keep them compatible.
- `README.md` says deployment targets a DigitalOcean Droplet. Avoid reintroducing Vercel-only assumptions unless explicitly requested.

## Validation Checklist

After changes, verify the relevant flow manually:

- App starts with `npm start`
- `GET /__health` returns JSON
- Registration still works through `/enviar`
- Login still creates a session and redirects or returns JSON correctly
- Protected access to `/pagina_principal` still requires authentication
- Chat still streams a response when `OPENAI_API_KEY` is configured
- Static assets under `/css`, `/imgs`, and `/javascript` still load

## Missing Tooling

There is currently no test suite or lint script defined in `package.json`.

Implication: when making changes, rely on narrow manual verification and avoid claiming automated coverage unless you add the tooling yourself.

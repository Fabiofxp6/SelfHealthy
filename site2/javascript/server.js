const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const app = express();
const PORT = Number(process.env.PORT) || 3000;
let cachedModelPromise = null;
const chatSessions = new Map();
const MAX_HISTORY = 12;
const VIEWS_PATH = path.join(__dirname, '..', 'views');
const BASE_NAV_LINKS = [
  { key: 'index', label: 'Início', href: '/' },
  { key: 'login', label: 'Login', href: '/login' },
  { key: 'cadastro', label: 'Cadastrar', href: '/cadastro' },
  { key: 'accessibility', label: 'Acessibilidade', href: '/accessibility' },
];
const navLinksPublic = () => BASE_NAV_LINKS.filter((link) => link.key !== 'accessibility');

// Configurações para ler os dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', 1);
app.use(session({
    name: 'selfhealthy.sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 2,
    }
}));
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/imgs', express.static(path.join(__dirname, '..', 'imgs')));
app.use('/javascript', express.static(path.join(__dirname, '..', 'javascript')));
app.set('view engine', 'ejs');
app.set('views', VIEWS_PATH);

// 1. Conexão com o MongoDB (Substitua pela sua URL do Atlas)
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Erro: defina a variável de ambiente MONGODB_URI.");
}

mongoose.set('strictQuery', true);
mongoose.connection.on('error', (err) => {
    console.error("Erro na conexão com o MongoDB:", err);
});

// 2. Definição do "Esquema" (o que será salvo)
const UsuarioSchema = new mongoose.Schema({
    nome: { type: String, required: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senhaHash: { type: String, required: true }
}, { timestamps: true });
const Usuario = mongoose.model('Usuario', UsuarioSchema);

// 3. Rota para servir o formulário HTML
app.get('/', (req, res) => {
    res.render('index', {
        navLinks: navLinksPublic(),
        activePage: 'index',
        footerActive: null
    });
});

app.get('/cadastro', (req, res) => {
    res.render('cadastro', {
        navLinks: navLinksPublic(),
        activePage: 'cadastro',
        footerActive: null
    });
});

app.get('/login', (req, res) => {
    res.render('login', {
        navLinks: navLinksPublic(),
        activePage: 'login',
        footerActive: null
    });
});

app.get('/accessibility', (req, res) => {
    res.render('accessibility', {
        navLinks: BASE_NAV_LINKS,
        activePage: 'accessibility',
        footerActive: 'accessibility'
    });
});

const requireAuth = (req, res, next) => {
    if (req.session?.userId) {
        return next();
    }
    return res.redirect('/login');
};

app.get('/pagina_principal', requireAuth, (req, res) => {
    res.render('pagina_principal', {
        navLinks: [{ key: 'logout', label: 'Sair', href: '/logout' }],
        activePage: null,
        footerActive: null
    });
});

app.get('/logout', (req, res) => {
    req.session?.destroy(() => {
        res.clearCookie('selfhealthy.sid');
        res.redirect('/');
    });
});

app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/login.html', (req, res) => res.redirect(301, '/login'));
app.get('/cadastro.html', (req, res) => res.redirect(301, '/cadastro'));
app.get('/accessibility.html', (req, res) => res.redirect(301, '/accessibility'));
app.get('/pagina_principal.html', (req, res) => res.redirect(301, '/pagina_principal'));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

app.post('/login', authLimiter, async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ ok: false, message: "Preencha e-mail e senha." });
    }

    try {
        const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (!usuario) {
            return res.status(401).json({ ok: false, message: "E-mail ou senha inválidos." });
        }

        const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaOk) {
            return res.status(401).json({ ok: false, message: "E-mail ou senha inválidos." });
        }

        req.session.userId = usuario._id.toString();
        req.session.userName = usuario.nome;
        res.json({ ok: true, message: "Login realizado com sucesso!", nome: usuario.nome });
    } catch (err) {
        res.status(500).json({ ok: false, message: "Erro ao realizar login." });
    }
});

const getChatModel = async () => {
    if (!cachedModelPromise) {
        cachedModelPromise = (async () => {
            const { ChatOpenAI } = await import("@langchain/openai");
            return new ChatOpenAI({
                model: "gpt-4.1",
                temperature: 0.4,
            });
        })();
    }
    return cachedModelPromise;
};

const normalizeContent = (content) => {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .map((part) => {
                if (typeof part === "string") return part;
                if (part && typeof part === "object" && "text" in part) {
                    return part.text;
                }
                return "";
            })
            .join("")
            .trim();
    }
    return "";
};

app.post('/api/chat', requireAuth, chatLimiter, async (req, res) => {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ ok: false, message: "Envie uma mensagem válida." });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ ok: false, message: "Defina OPENAI_API_KEY no .env." });
    }

    try {
        const llm = await getChatModel();
        const key = req.session.userId;
        const history = chatSessions.get(key) || [];

        const systemPrompt = [
            "Você é um profissional de saúde mental do SelfHealthy.",
            "Fale com empatia, acolhimento e linguagem clara.",
            "O usuário pode estar emocionalmente fragilizado; valide sentimentos sem julgar.",
            "Ofereça passos simples e seguros. Não substitua atendimento profissional.",
            "Se o usuário mencionar risco de autoagressão ou suicídio, incentive buscar ajuda imediata e apoio local.",
        ].join(" ");

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: message },
        ];

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Transfer-Encoding", "chunked");

        const stream = await llm.stream(messages);
        let fullReply = "";

        for await (const chunk of stream) {
            const piece = normalizeContent(chunk.content);
            if (piece) {
                fullReply += piece;
                res.write(piece);
            }
        }

        res.end();

        const nextHistory = [...history, { role: "user", content: message }, { role: "assistant", content: fullReply || "" }]
            .slice(-MAX_HISTORY);
        chatSessions.set(key, nextHistory);
    } catch (err) {
        console.error("Erro no LangChain:", err);
        if (!res.headersSent) {
            const status = err?.status || err?.response?.status;
            if (status === 429) {
                return res.status(429).json({
                    ok: false,
                    message: "Sem cota disponível no momento. Verifique seu plano/limites da OpenAI e tente novamente.",
                });
            }
            return res.status(500).json({ ok: false, message: "Erro ao conversar com o assistente." });
        }
        res.end();
    }
});

// 4. Rota para receber os dados do POST
app.post('/enviar', authLimiter, async (req, res) => {
    const { nome, email, senha, confirmar_senha } = req.body;

    if (!nome || !email || !senha || !confirmar_senha) {
        return res.status(400).json({ ok: false, message: "Preencha todos os campos." });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
        return res.status(400).json({ ok: false, message: "E-mail inválido." });
    }

    if (senha.length < 8) {
        return res.status(400).json({ ok: false, message: "A senha deve ter pelo menos 8 caracteres." });
    }

    if (senha !== confirmar_senha) {
        return res.status(400).json({ ok: false, message: "As senhas não conferem." });
    }

    try {
        const senhaHash = await bcrypt.hash(senha, 10);
        const novoUsuario = new Usuario({
            nome: nome.trim(),
            email: email.trim(),
            senhaHash
        });

        await novoUsuario.save();
        res.json({ ok: true, message: "Cadastro realizado com sucesso!" });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ ok: false, message: "E-mail já cadastrado." });
        }
        res.status(500).json({ ok: false, message: "Erro ao salvar." });
    }
});

app.use((req, res) => {
    res.status(404).render('404', {
        navLinks: BASE_NAV_LINKS.filter((link) => link.key !== 'accessibility'),
        activePage: null,
        footerActive: null
    });
});

const connectToDatabase = async () => {
    if (!MONGODB_URI) {
        throw new Error("MONGODB_URI não definido.");
    }
    if (mongoose.connection.readyState === 1) {
        return;
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Conectado ao MongoDB!");
};

const startServer = async () => {
    try {
        await connectToDatabase();
        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("Erro ao conectar no MongoDB:", err);
        process.exit(1);
    }
};

module.exports = { app, startServer, connectToDatabase };

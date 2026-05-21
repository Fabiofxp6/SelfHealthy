const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();
const app = express();
const PORT = Number(process.env.PORT) || 3000;
let cachedModelPromise = null;
const chatSessions = new Map();
const MAX_HISTORY = 12;
const VIEWS_PATH = path.join(__dirname, '..', 'views');
const UPLOADS_PATH = path.join(__dirname, '..', 'imgs', 'uploads');
const BASE_NAV_LINKS = [
    { key: 'index', label: 'Início', href: '/' },
    { key: 'login', label: 'Login', href: '/login' },
    { key: 'accessibility', label: 'Acessibilidade', href: '/accessibility' },
];
const navLinksPublic = () => BASE_NAV_LINKS.filter((link) => link.key !== 'accessibility');
const navLinksAuthenticated = () => ([
    { key: 'blog', label: 'Blog', href: '/blog' },
    { key: 'assistant', label: 'Assistente SH', href: '/pagina_principal' },
    { key: 'profile', label: 'Perfil', href: '/perfil' },
    { key: 'logout', label: 'Sair', href: '/logout' },
]);

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
app.use('/uploads', express.static(UPLOADS_PATH));
app.use('/javascript', express.static(path.join(__dirname, '..', 'javascript')));
app.set('view engine', 'ejs');
app.set('views', VIEWS_PATH);

const ensureUploadsDirectory = () => {
    fs.mkdirSync(UPLOADS_PATH, { recursive: true });
};

ensureUploadsDirectory();

// 1. Conexão com o MongoDB (Substitua pela sua URL do Atlas)
const normalizeEnvValue = (value) => {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    const hasMatchingQuotes =
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"));

    return hasMatchingQuotes ? trimmed.slice(1, -1) : trimmed;
};

const MONGODB_URI = normalizeEnvValue(process.env.MONGODB_URI);

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
    senhaHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
}, { timestamps: true });
const Usuario = mongoose.model('Usuario', UsuarioSchema);

const ArtigoSchema = new mongoose.Schema({
    titulo: { type: String, required: true },
    conteudo: { type: String, required: true },
    editor: { type: String, required: true },
    capa: { type: String, default: null }, // Nome do arquivo salvo
    tag: { type: String, default: 'Saúde' },
    destaque: { type: String, enum: [null, 'principal', 'lateral1', 'lateral2'], default: null },
    data: { type: Date, default: Date.now }
}, { timestamps: true });
const Artigo = mongoose.model('Artigo', ArtigoSchema);

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadsDirectory();
        cb(null, UPLOADS_PATH);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 3. Rota para servir a página inicial pública
app.get('/', (req, res) => {
    res.render('index', {
        navLinks: [{ key: 'login', label: 'Login', href: '/login' }],
        activePage: 'index',
        footerActive: null
    });
});

const renderBlog = async (req, res) => {
    try {
        const destaquePrincipal = await Artigo.findOne({ destaque: 'principal' });
        const destaqueLateral1 = await Artigo.findOne({ destaque: 'lateral1' });
        const destaqueLateral2 = await Artigo.findOne({ destaque: 'lateral2' });
        const artigos = await Artigo.find({ destaque: null }).sort({ data: -1 }).limit(10);
        res.render('blog', {
            navLinks: navLinksAuthenticated(),
            activePage: 'blog',
            footerActive: null,
            artigos: artigos,
            destaquePrincipal,
            destaqueLateral1,
            destaqueLateral2
        });
    } catch (err) {
        console.error("Erro ao buscar artigos:", err);
        res.render('blog', {
            navLinks: navLinksAuthenticated(),
            activePage: 'blog',
            footerActive: null,
            artigos: [],
            destaquePrincipal: null,
            destaqueLateral1: null,
            destaqueLateral2: null
        });
    }
};

app.get('/cadastro', (req, res) => {
    if (req.session?.userId) {
        return res.redirect(req.session.isAdmin ? '/admin/dashboard' : '/blog');
    }
    res.render('cadastro', {
        navLinks: navLinksPublic(),
        activePage: 'cadastro',
        footerActive: null
    });
});

app.get('/login', (req, res) => {
    if (req.session?.userId) {
        return res.redirect(req.session.isAdmin ? '/admin/dashboard' : '/blog');
    }
    res.render('login', {
        navLinks: navLinksPublic(),
        activePage: 'login',
        footerActive: null,
        serverMessage: null,
        serverMessageType: null
    });
});

app.get('/accessibility', (req, res) => {
    res.render('accessibility', {
        navLinks: BASE_NAV_LINKS,
        activePage: 'accessibility',
        footerActive: 'accessibility'
    });
});

app.get('/__health', (req, res) => {
    res.json({
        ok: true,
        env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
        commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
        url: req.originalUrl,
        hasSession: Boolean(req.session?.userId)
    });
});

const requireAuth = (req, res, next) => {
    if (req.session?.userId) {
        return next();
    }
    return res.redirect('/login');
};

app.get('/blog', requireAuth, renderBlog);

const requireAdmin = async (req, res, next) => {
    if (!req.session?.userId) {
        return res.redirect('/login');
    }
    try {
        const usuario = await Usuario.findById(req.session.userId);
        if (usuario && usuario.isAdmin) {
            return next();
        }
        return res.status(403).send("Acesso negado. Apenas administradores podem acessar esta área.");
    } catch (err) {
        return res.status(500).send("Erro interno ao verificar permissões.");
    }
};

app.get('/pagina_principal', requireAuth, (req, res) => {
    res.render('pagina_principal', {
        navLinks: navLinksAuthenticated(),
        activePage: 'assistant',
        footerActive: null
    });
});

app.get('/perfil', requireAuth, async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.session.userId).lean();
        if (!usuario) {
            req.session.destroy(() => {
                res.clearCookie('selfhealthy.sid');
                res.redirect('/login');
            });
            return;
        }

        res.render('perfil', {
            navLinks: navLinksAuthenticated(),
            activePage: 'profile',
            footerActive: null,
            usuario
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar perfil.");
    }
});

app.get('/logout', (req, res) => {
    req.session?.destroy(() => {
        res.clearCookie('selfhealthy.sid');
        res.redirect('/');
    });
});

app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/blog.html', (req, res) => res.redirect(301, '/blog'));
app.get('/login.html', (req, res) => res.redirect(301, '/login'));
app.get('/cadastro.html', (req, res) => res.redirect(301, '/cadastro'));
app.get('/accessibility.html', (req, res) => res.redirect(301, '/accessibility'));
app.get('/pagina_principal.html', (req, res) => res.redirect(301, '/pagina_principal'));
app.get('/perfil.html', (req, res) => res.redirect(301, '/perfil'));

// --- ROTAS ADMINISTRATIVAS ---

app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const artigos = await Artigo.find().sort({ data: -1 });
        res.render('admin/dashboard', {
            navLinks: [{ key: 'logout', label: 'Sair', href: '/logout' }],
            artigos: artigos
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar dashboard.");
    }
});

app.get('/admin/artigo/novo', requireAdmin, (req, res) => {
    res.render('admin/artigo_form', {
        navLinks: [{ key: 'logout', label: 'Sair', href: '/logout' }],
        artigo: null
    });
});

app.post('/admin/artigo/novo', requireAdmin, upload.single('capa'), async (req, res) => {
    const { titulo, conteudo, editor, tag, destaque } = req.body;
    const capa = req.file ? req.file.filename : null;

    if (!titulo || !conteudo || !editor) {
        return res.status(400).send("Título, conteúdo e editor são obrigatórios.");
    }

    try {
        const destaqueValue = destaque || null;
        // Se esse artigo vai ocupar uma posição de destaque, remove o anterior dessa posição
        if (destaqueValue) {
            await Artigo.updateMany({ destaque: destaqueValue }, { destaque: null });
        }
        const novoArtigo = new Artigo({ titulo, conteudo, editor, capa, tag: tag || 'Saúde', destaque: destaqueValue });
        await novoArtigo.save();
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao salvar artigo.");
    }
});

app.get('/admin/artigo/editar/:id', requireAdmin, async (req, res) => {
    try {
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) return res.status(404).send("Artigo não encontrado.");
        res.render('admin/artigo_form', {
            navLinks: [{ key: 'logout', label: 'Sair', href: '/logout' }],
            artigo: artigo
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar artigo.");
    }
});

app.post('/admin/artigo/editar/:id', requireAdmin, upload.single('capa'), async (req, res) => {
    const { titulo, conteudo, editor, tag, destaque } = req.body;
    const destaqueValue = destaque || null;
    let updateData = { titulo, conteudo, editor, tag: tag || 'Saúde', destaque: destaqueValue };

    if (req.file) {
        updateData.capa = req.file.filename;
    }

    try {
        // Se esse artigo vai ocupar uma posição de destaque, remove o anterior dessa posição
        if (destaqueValue) {
            await Artigo.updateMany(
                { destaque: destaqueValue, _id: { $ne: req.params.id } },
                { destaque: null }
            );
        }
        await Artigo.findByIdAndUpdate(req.params.id, updateData);
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Erro ao atualizar artigo.");
    }
});

app.post('/admin/artigo/deletar/:id', requireAdmin, async (req, res) => {
    try {
        await Artigo.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Erro ao deletar artigo.");
    }
});

app.get('/artigo/:id', requireAuth, async (req, res) => {
    try {
        const artigo = await Artigo.findById(req.params.id);
        if (!artigo) return res.status(404).render('404', { navLinks: navLinksAuthenticated(), activePage: null, footerActive: null });
        res.render('artigo', {
            navLinks: navLinksAuthenticated(),
            activePage: 'blog',
            footerActive: null,
            artigo: artigo
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar artigo.");
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

const buildFieldErrorMap = (entries) => Object.fromEntries(entries.filter(([, value]) => Boolean(value)));

const validateRegistration = ({ nome, email, senha, confirmar_senha }) => {
    const fieldErrors = buildFieldErrorMap([
        ['nome', !nome ? "Preencha seu nome completo." : (nome.trim().length < 3 ? "Informe um nome com pelo menos 3 caracteres." : null)],
        ['email', !email ? "Preencha seu e-mail." : null],
        ['senha', !senha ? "Preencha sua senha." : (senha.length < 8 ? "A senha deve ter pelo menos 8 caracteres." : null)],
        ['confirmar_senha', !confirmar_senha ? "Confirme sua senha." : null],
    ]);

    if (!fieldErrors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fieldErrors.email = "E-mail inválido.";
    }

    if (!fieldErrors.senha && !fieldErrors.confirmar_senha && senha !== confirmar_senha) {
        fieldErrors.confirmar_senha = "As senhas não conferem.";
    }

    return fieldErrors;
};

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

app.post('/login', authLimiter, async (req, res) => {
    const expectsJson = req.is('application/json') || req.headers['x-requested-with'] === 'XMLHttpRequest';
    const { email, senha } = req.body;

    if (!email || !senha) {
        const fieldErrors = buildFieldErrorMap([
            ['email', !email ? "Preencha seu e-mail." : null],
            ['senha', !senha ? "Preencha sua senha." : null],
        ]);

        if (expectsJson) {
            return res.status(400).json({ ok: false, message: "Preencha os campos obrigatórios.", fieldErrors });
        }
        return res.status(400).render('login', {
            navLinks: navLinksPublic(),
            activePage: 'login',
            footerActive: null,
            serverMessage: "Preencha e-mail e senha.",
            serverMessageType: "is-error"
        });
    }

    try {
        const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
        if (!usuario) {
            if (expectsJson) {
                return res.status(401).json({
                    ok: false,
                    message: "E-mail ou senha inválidos.",
                    fieldErrors: { email: "Verifique seu e-mail ou senha.", senha: "Verifique seu e-mail ou senha." }
                });
            }
            return res.status(401).render('login', {
                navLinks: navLinksPublic(),
                activePage: 'login',
                footerActive: null,
                serverMessage: "E-mail ou senha inválidos.",
                serverMessageType: "is-error"
            });
        }

        const senhaOk = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaOk) {
            if (expectsJson) {
                return res.status(401).json({
                    ok: false,
                    message: "E-mail ou senha inválidos.",
                    fieldErrors: { email: "Verifique seu e-mail ou senha.", senha: "Verifique seu e-mail ou senha." }
                });
            }
            return res.status(401).render('login', {
                navLinks: navLinksPublic(),
                activePage: 'login',
                footerActive: null,
                serverMessage: "E-mail ou senha inválidos.",
                serverMessageType: "is-error"
            });
        }

        req.session.userId = usuario._id.toString();
        req.session.userName = usuario.nome;
        req.session.isAdmin = usuario.isAdmin;

        if (expectsJson) {
            return res.json({ 
                ok: true, 
                message: "Login realizado com sucesso!", 
                nome: usuario.nome,
                isAdmin: usuario.isAdmin 
            });
        }
        
        if (usuario.isAdmin) {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/blog');
    } catch (err) {
        if (expectsJson) {
            return res.status(500).json({ ok: false, message: "Erro ao realizar login." });
        }
        return res.status(500).render('login', {
            navLinks: navLinksPublic(),
            activePage: 'login',
            footerActive: null,
            serverMessage: "Erro ao realizar login.",
            serverMessageType: "is-error"
        });
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
            "Evite termos clínicos complexos. Seja um guia amigável para o bem-estar emocional.",
            "Não se alongue nas respostas, seja direto e objetivo.",
            "Não faça perguntas que possam ser interpretadas como invasivas ou desrespeitosas.",
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
    const fieldErrors = validateRegistration({ nome, email, senha, confirmar_senha });

    if (Object.keys(fieldErrors).length > 0) {
        return res.status(400).json({ ok: false, message: "Revise os campos destacados.", fieldErrors });
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
            return res.status(409).json({
                ok: false,
                message: "E-mail já cadastrado.",
                fieldErrors: { email: "Este e-mail já está em uso." }
            });
        }
        res.status(500).json({ ok: false, message: "Erro ao salvar." });
    }
});

app.use((req, res) => {
    console.warn(`[404] ${req.method} ${req.originalUrl}`);
    res.status(404).render('404', {
        navLinks: req.session?.userId ? navLinksAuthenticated() : navLinksPublic(),
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

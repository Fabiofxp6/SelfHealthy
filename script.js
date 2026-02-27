/**
 * SelfHealthy - Gerenciador de Estado do Protótipo
 */

// 1. Splash Screen Timeout
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none'; // Garante que não bloqueie cliques
                navigateTo('auth');
            }, 600);
        }
    }, 2000);
});

// 2. Sistema de Navegação SPA
function navigateTo(screenId) {
    // Esconde todas as seções
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    // Mostra a seção desejada
    const target = document.getElementById(screenId + '-screen');
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('fade-in');
    }
}

// 3. Toggle de Abas Login/Cadastro
function switchAuthTab(type, element) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    
    const btn = document.querySelector('#auth-form .btn-primary');
    btn.innerText = type === 'login' ? 'Entrar' : 'Criar minha conta';
}

// 4. Lógica de IA e Disponibilidade de Humano
function handleMoodSubmit() {
    const text = document.getElementById('mood-input').value;
    if (!text.trim()) {
        alert("Por favor, conte-nos um pouco sobre como você está.");
        return;
    }

    navigateTo('chat');
    const chatFlow = document.getElementById('chat-flow');
    
    // Início da interação
    chatFlow.innerHTML = `
        <div class="msg msg-user fade-in">${text}</div>
        <div class="msg msg-ai fade-in">Obrigado por compartilhar. Analisei seu relato e notei sinais de cansaço produtivo. Vou te conectar com um especialista...</div>
    `;

    // Simulação de delay de rede/processamento
    setTimeout(() => {
        const isAvailable = Math.random() > 0.5;
        
        if (isAvailable) {
            chatFlow.innerHTML += `
                <div class="msg msg-ai fade-in">
                    <strong>✅ Dr. Ricardo está disponível!</strong><br>
                    Ele já leu seu resumo. Você gostaria de iniciar a chamada agora?
                </div>
            `;
        } else {
            chatFlow.innerHTML += `
                <div class="msg msg-ai fade-in">
                    <strong>📅 Dra. Juliana está em sessão.</strong><br>
                    Ela é especialista neste tema. Escolha o melhor horário para hoje:
                    <div class="hours-grid">
                        <div class="hour-tag" onclick="confirmBooking('15:00')">15:00</div>
                        <div class="hour-tag" onclick="confirmBooking('16:30')">16:30</div>
                        <div class="hour-tag" onclick="confirmBooking('18:00')">18:00</div>
                    </div>
                </div>
            `;
        }
    }, 1500);
}

function confirmBooking(time) {
    alert(`Agendamento confirmado para às ${time}. Enviaremos um link para o seu e-mail!`);
    navigateTo('dashboard');
    document.getElementById('mood-input').value = ""; // limpa o campo
}
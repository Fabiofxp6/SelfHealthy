const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatMessage');
const chatWindow = document.getElementById('chatWindow');

const updateGreeting = () => {
  const greetingMessage = chatWindow?.querySelector('.chat-message.bot p');
  if (!greetingMessage) {
    return;
  }

  const storedName = localStorage.getItem('usuarioNome');
  if (storedName) {
    greetingMessage.textContent = `Oi, ${storedName}! Posso ajudar com dicas de saúde, hábitos e dúvidas gerais. Como posso ajudar hoje?`;
  }
};

const formatTime = () => new Date().toLocaleTimeString('pt-BR', {
  hour: '2-digit',
  minute: '2-digit'
});

const appendMessage = (text, role) => {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}`;

  const message = document.createElement('p');
  message.textContent = text;

  const time = document.createElement('span');
  time.className = 'chat-time';
  time.textContent = formatTime();

  wrapper.appendChild(message);
  wrapper.appendChild(time);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return wrapper;
};

const appendStreamingMessage = () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-message bot';

  const message = document.createElement('p');
  message.textContent = '';

  const time = document.createElement('span');
  time.className = 'chat-time';
  time.textContent = formatTime();

  wrapper.appendChild(message);
  wrapper.appendChild(time);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return message;
};

const setPending = (on) => {
  if (on) {
    const pending = document.createElement('div');
    pending.className = 'chat-message bot';
    pending.setAttribute('data-pending', 'true');
    pending.innerHTML = '<p>Digitando...</p><span class="chat-time">Agora</span>';
    chatWindow.appendChild(pending);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return pending;
  }

  const pending = chatWindow.querySelector('[data-pending="true"]');
  if (pending) {
    pending.remove();
  }
  return null;
};

chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) {
    return;
  }

  appendMessage(text, 'user');
  chatInput.value = '';
  chatInput.focus();

  setPending(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Erro ao conversar com o assistente.');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const data = await response.json().catch(() => ({}));
      appendMessage(data.reply || 'Não consegui gerar uma resposta agora.', 'bot');
      return;
    }

    const decoder = new TextDecoder('utf-8');
    const messageEl = appendStreamingMessage();
    let accumulated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      accumulated += decoder.decode(value, { stream: true });
      messageEl.textContent = accumulated;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  } catch (error) {
    setPending(false);
    const message = error?.message || 'Não consegui responder agora. Tente novamente.';
    appendMessage(message, 'bot');
  }
});

updateGreeting();

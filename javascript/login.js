const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

if (loginForm && loginMessage) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginMessage.textContent = '';
    loginMessage.classList.remove('is-error', 'is-success');

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        loginMessage.textContent = data.message || 'Não foi possível realizar o login.';
        loginMessage.classList.add('is-error');
        return;
      }

      loginMessage.textContent = data.message || 'Login realizado com sucesso!';
      loginMessage.classList.add('is-success');
      if (data.nome) {
        localStorage.setItem('usuarioNome', data.nome);
      }
      setTimeout(() => {
        window.location.href = data.isAdmin ? '/admin/dashboard' : '/pagina_principal';
      }, 800);
    } catch (err) {
      loginMessage.textContent = 'Erro de conexão. Tente novamente.';
      loginMessage.classList.add('is-error');
    }
  });
}

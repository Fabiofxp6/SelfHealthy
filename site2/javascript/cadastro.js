const form = document.getElementById('cadastro-form');
const messageEl = document.getElementById('form-message');

if (form && messageEl) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    messageEl.textContent = '';
    messageEl.classList.remove('is-error', 'is-success');

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        messageEl.textContent = data.message || 'Não foi possível realizar o cadastro.';
        messageEl.classList.add('is-error');
        return;
      }

      messageEl.textContent = data.message || 'Cadastro realizado com sucesso!';
      messageEl.classList.add('is-success');
      form.reset();
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      messageEl.textContent = 'Erro de conexão. Tente novamente.';
      messageEl.classList.add('is-error');
    }
  });
}

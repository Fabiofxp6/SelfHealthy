const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

const loginFields = ['email', 'senha'];

const clearFieldError = (fieldName) => {
  const field = loginForm?.elements.namedItem(fieldName);
  const errorEl = document.getElementById(`${fieldName}-error`);
  if (field instanceof HTMLElement) {
    field.removeAttribute('aria-invalid');
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
};

const setFieldError = (fieldName, message) => {
  const field = loginForm?.elements.namedItem(fieldName);
  const errorEl = document.getElementById(`${fieldName}-error`);
  if (field instanceof HTMLElement) {
    field.setAttribute('aria-invalid', 'true');
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
};

const resetLoginErrors = () => {
  loginFields.forEach(clearFieldError);
  loginMessage.textContent = '';
  loginMessage.classList.remove('is-error', 'is-success');
};

const validateLogin = (payload) => {
  const fieldErrors = {};

  if (!payload.email?.trim()) {
    fieldErrors.email = 'Preencha seu e-mail.';
  }

  if (!payload.senha) {
    fieldErrors.senha = 'Preencha sua senha.';
  }

  return fieldErrors;
};

if (loginForm && loginMessage) {
  loginFields.forEach((fieldName) => {
    const field = loginForm.elements.namedItem(fieldName);
    if (field instanceof HTMLElement) {
      field.addEventListener('input', () => clearFieldError(fieldName));
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetLoginErrors();

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());
    const clientErrors = validateLogin(payload);
    const firstClientField = loginFields.find((fieldName) => clientErrors[fieldName]);

    if (firstClientField) {
      Object.entries(clientErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
      loginMessage.textContent = 'Revise os campos destacados.';
      loginMessage.classList.add('is-error');
      loginForm.elements.namedItem(firstClientField)?.focus();
      return;
    }

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fieldErrors = data.fieldErrors || {};
        const firstErrorField = loginFields.find((fieldName) => fieldErrors[fieldName]);
        Object.entries(fieldErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
        loginMessage.textContent = data.message || 'Não foi possível realizar o login.';
        loginMessage.classList.add('is-error');
        if (firstErrorField) {
          loginForm.elements.namedItem(firstErrorField)?.focus();
        }
        return;
      }

      loginMessage.textContent = data.message || 'Login realizado com sucesso!';
      loginMessage.classList.add('is-success');
      if (data.nome) {
        localStorage.setItem('usuarioNome', data.nome);
      }
      setTimeout(() => {
        window.location.href = data.isAdmin ? '/admin/dashboard' : '/blog';
      }, 800);
    } catch (err) {
      loginMessage.textContent = 'Erro de conexão. Tente novamente.';
      loginMessage.classList.add('is-error');
    }
  });
}

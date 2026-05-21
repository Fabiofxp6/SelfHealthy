const form = document.getElementById('cadastro-form');
const messageEl = document.getElementById('form-message');

const registrationFields = ['nome', 'email', 'senha', 'confirmar_senha'];

const clearFieldError = (fieldName) => {
  const field = form?.elements.namedItem(fieldName);
  const errorEl = document.getElementById(`${fieldName.replace('_', '-')}-error`);
  if (field instanceof HTMLElement) {
    field.removeAttribute('aria-invalid');
  }
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.hidden = true;
  }
};

const setFieldError = (fieldName, message) => {
  const field = form?.elements.namedItem(fieldName);
  const errorEl = document.getElementById(`${fieldName.replace('_', '-')}-error`);
  if (field instanceof HTMLElement) {
    field.setAttribute('aria-invalid', 'true');
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
};

const resetRegistrationErrors = () => {
  registrationFields.forEach(clearFieldError);
  messageEl.textContent = '';
  messageEl.classList.remove('is-error', 'is-success');
};

const validateRegistration = (payload) => {
  const fieldErrors = {};

  if (!payload.nome?.trim()) {
    fieldErrors.nome = 'Preencha seu nome completo.';
  } else if (payload.nome.trim().length < 3) {
    fieldErrors.nome = 'Informe um nome com pelo menos 3 caracteres.';
  }

  if (!payload.email?.trim()) {
    fieldErrors.email = 'Preencha seu e-mail.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    fieldErrors.email = 'E-mail inválido.';
  }

  if (!payload.senha) {
    fieldErrors.senha = 'Preencha sua senha.';
  } else if (payload.senha.length < 8) {
    fieldErrors.senha = 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (!payload.confirmar_senha) {
    fieldErrors.confirmar_senha = 'Confirme sua senha.';
  } else if (payload.senha && payload.confirmar_senha !== payload.senha) {
    fieldErrors.confirmar_senha = 'As senhas não conferem.';
  }

  return fieldErrors;
};

if (form && messageEl) {
  registrationFields.forEach((fieldName) => {
    const field = form.elements.namedItem(fieldName);
    if (field instanceof HTMLElement) {
      field.addEventListener('input', () => clearFieldError(fieldName));
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetRegistrationErrors();

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    const clientErrors = validateRegistration(payload);
    const firstClientField = registrationFields.find((fieldName) => clientErrors[fieldName]);

    if (firstClientField) {
      Object.entries(clientErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
      messageEl.textContent = 'Revise os campos destacados.';
      messageEl.classList.add('is-error');
      form.elements.namedItem(firstClientField)?.focus();
      return;
    }

    try {
      const response = await fetch('/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fieldErrors = data.fieldErrors || {};
        const firstErrorField = registrationFields.find((fieldName) => fieldErrors[fieldName]);
        Object.entries(fieldErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
        messageEl.textContent = data.message || 'Não foi possível realizar o cadastro.';
        messageEl.classList.add('is-error');
        if (firstErrorField) {
          form.elements.namedItem(firstErrorField)?.focus();
        }
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

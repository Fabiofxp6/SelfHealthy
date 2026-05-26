const esqueciForm = document.getElementById('esqueci-form');
const esqueciMessage = document.getElementById('esqueci-message');

const esqueciFields = ['email', 'senha', 'confirmar_senha'];

const clearFieldError = (fieldName) => {
  const field = esqueciForm?.elements.namedItem(fieldName);
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
  const field = esqueciForm?.elements.namedItem(fieldName);
  const errorEl = document.getElementById(`${fieldName.replace('_', '-')}-error`);
  if (field instanceof HTMLElement) {
    field.setAttribute('aria-invalid', 'true');
  }
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
};

const resetEsqueciErrors = () => {
  esqueciFields.forEach(clearFieldError);
  esqueciMessage.textContent = '';
  esqueciMessage.classList.remove('is-error', 'is-success');
};

const validateEsqueci = (payload) => {
  const fieldErrors = {};

  if (!payload.email?.trim()) {
    fieldErrors.email = 'Preencha seu e-mail.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    fieldErrors.email = 'E-mail inválido.';
  }

  if (!payload.senha) {
    fieldErrors.senha = 'Preencha a nova senha.';
  } else if (payload.senha.length < 8) {
    fieldErrors.senha = 'A senha deve ter pelo menos 8 caracteres.';
  }

  if (!payload.confirmar_senha) {
    fieldErrors.confirmar_senha = 'Confirme a nova senha.';
  } else if (payload.senha && payload.confirmar_senha !== payload.senha) {
    fieldErrors.confirmar_senha = 'As senhas não conferem.';
  }

  return fieldErrors;
};

if (esqueciForm && esqueciMessage) {
  esqueciFields.forEach((fieldName) => {
    const field = esqueciForm.elements.namedItem(fieldName);
    if (field instanceof HTMLElement) {
      field.addEventListener('input', () => clearFieldError(fieldName));
    }
  });

  esqueciForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    resetEsqueciErrors();

    const formData = new FormData(esqueciForm);
    const payload = Object.fromEntries(formData.entries());
    const clientErrors = validateEsqueci(payload);
    const firstClientField = esqueciFields.find((fieldName) => clientErrors[fieldName]);

    if (firstClientField) {
      Object.entries(clientErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
      esqueciMessage.textContent = 'Revise os campos destacados.';
      esqueciMessage.classList.add('is-error');
      esqueciForm.elements.namedItem(firstClientField)?.focus();
      return;
    }

    try {
      const response = await fetch('/esqueci-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const fieldErrors = data.fieldErrors || {};
        const firstErrorField = esqueciFields.find((fieldName) => fieldErrors[fieldName]);
        Object.entries(fieldErrors).forEach(([fieldName, message]) => setFieldError(fieldName, message));
        esqueciMessage.textContent = data.message || 'Não foi possível redefinir a senha.';
        esqueciMessage.classList.add('is-error');
        if (firstErrorField) {
          esqueciForm.elements.namedItem(firstErrorField)?.focus();
        }
        return;
      }

      esqueciMessage.textContent = data.message || 'Senha redefinida com sucesso!';
      esqueciMessage.classList.add('is-success');
      esqueciForm.reset();
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      esqueciMessage.textContent = 'Erro de conexão. Tente novamente.';
      esqueciMessage.classList.add('is-error');
    }
  });
}

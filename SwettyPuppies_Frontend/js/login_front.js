document.addEventListener('DOMContentLoaded', () => {
  if (typeof checkSession === 'function' && checkSession() === false) {
    return;
  }

  const state = {
    currentView: 'landing',
    pendingEmail: ''
  };

  const views = document.querySelectorAll('[data-auth-view]');
  const switchButtons = document.querySelectorAll('[data-switch-view]');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const verifyForm = document.getElementById('verifyForm');
  const resendCodeButton = document.getElementById('resendCodeBtn');
  const verifyEmailLabel = document.getElementById('verifyEmailLabel');

  function showView(viewName) {
    state.currentView = viewName;
    views.forEach((view) => {
      view.hidden = view.dataset.authView !== viewName;
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-mensaje');

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  function setPendingEmail(email) {
    state.pendingEmail = email;
    verifyEmailLabel.textContent = email;
    document.getElementById('verifyEmail').value = email;
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function setLoading(button, isLoading, loadingText = 'Procesando...') {
    if (!button) {
      return;
    }

    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
      button.classList.add('loading');
      return;
    }

    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove('loading');
  }

  function getFormValues(form) {
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Ocurrio un error en la solicitud');
    }

    return data;
  }

  function normalizeRedirectPath(redirectTo, role) {
    if (role === 'cliente' || redirectTo === '/cliente-dashboard.html') {
      return '/cliente';
    }

    if (role === 'administrador' || redirectTo === '/index.html') {
      return '/admin';
    }

    return redirectTo || '/login';
  }

  switchButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetView = button.dataset.switchView;
      if (targetView) {
        showView(targetView);
      }
    });
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const values = getFormValues(registerForm);
    const submitButton = registerForm.querySelector('button[type="submit"]');

    if (
      !values.nombre ||
      !values.apellido ||
      !values.cedula ||
      !values.telefono ||
      !values.email ||
      !values.password ||
      !values.confirmPassword
    ) {
      showToast('Completa todos los campos del registro', 'error');
      return;
    }

    if (!validateEmail(values.email)) {
      showToast('Escribe un correo valido', 'error');
      return;
    }

    if (values.password !== values.confirmPassword) {
      showToast('Las contrasenas no coinciden', 'error');
      return;
    }

    setLoading(submitButton, true, 'Generando codigo...');

    try {
      const data = await postJson('/api/auth/register/initiate', values);
      setPendingEmail(data.email);
      showView('verify');
      document.getElementById('codigo').value = '';
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(submitButton, false);
    }
  });

  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const values = getFormValues(verifyForm);
    const submitButton = verifyForm.querySelector('button[type="submit"]');

    if (!values.email || !values.codigo) {
      showToast('Debes escribir el correo y el codigo', 'error');
      return;
    }

    setLoading(submitButton, true, 'Verificando...');

    try {
      const data = await postJson('/api/auth/register/verify', values);
      showToast(data.message, 'success');
      registerForm.reset();
      verifyForm.reset();
      document.getElementById('loginEmail').value = values.email;
      showView('login');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(submitButton, false);
    }
  });

  resendCodeButton.addEventListener('click', async () => {
    const values = getFormValues(registerForm);
    const email = state.pendingEmail || values.email;

    if (!email) {
      showToast('Primero completa el registro para regenerar el codigo', 'error');
      showView('register');
      return;
    }

    const payload = {
      nombre: values.nombre,
      apellido: values.apellido,
      cedula: values.cedula,
      telefono: values.telefono,
      email,
      password: values.password,
      confirmPassword: values.confirmPassword
    };

    if (!payload.nombre || !payload.apellido || !payload.cedula || !payload.telefono || !payload.password) {
      showToast('Conserva los datos del registro para regenerar el codigo', 'error');
      showView('register');
      return;
    }

    setLoading(resendCodeButton, true, 'Regenerando...');

    try {
      const data = await postJson('/api/auth/register/initiate', payload);
      setPendingEmail(data.email);
      document.getElementById('codigo').value = '';
      showToast(data.message, 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(resendCodeButton, false);
    }
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const values = getFormValues(loginForm);
    const submitButton = loginForm.querySelector('button[type="submit"]');

    if (!values.email || !values.password) {
      showToast('Correo y contrasena son obligatorios', 'error');
      return;
    }

    setLoading(submitButton, true, 'Ingresando...');

    try {
      const data = await postJson('/api/auth/login', values);
      const redirectPath = normalizeRedirectPath(data.redirectTo, data.user?.rol);

      if (typeof sessionManager !== 'undefined') {
        sessionManager.setSession(data.token, data.user);
      }

      showToast(data.message, 'success');

      setTimeout(() => {
        window.location.href = redirectPath;
      }, 800);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(submitButton, false);
    }
  });

  showView('landing');
});

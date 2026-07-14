document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const rfidUid = document.getElementById('rfidUid').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('loginError');
  errorEl.textContent = '';

  try {
    const response = await fetch(`${CONFIG.API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfidUid, password }),
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Falha no login.');

    saveSession(data.token, data.collaborator);
    window.location.href = 'index.html';
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

// Se já houver sessão válida, salta o login.
if (getSession()) {
  window.location.href = 'index.html';
}
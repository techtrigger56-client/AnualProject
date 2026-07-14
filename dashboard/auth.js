const AUTH_KEY = 'ses_session';

function saveSession(token, collaborator) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ token, collaborator }));
}

function getSession() {
  const raw = localStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

// Chamar no topo de qualquer página protegida.
// Devolve a sessão se existir, ou redireciona para o login e devolve null.
function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

function logout() {
  clearSession();
  window.location.href = 'login.html';
}
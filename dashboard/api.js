async function apiRequest(path, options = {}) {
  const session = getSession();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const response = await fetch(`${CONFIG.API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    throw new Error('Sessão expirada.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Erro ${response.status}`);
  }
  return data;
}

// Imagens não podem usar Authorization header via <img src="...">,
// por isso buscam-se como blob autenticado e convertem-se em URL local.
async function apiFetchImageUrl(filename) {
  const session = getSession();
  const response = await fetch(`${CONFIG.API_BASE}/photo-files/${filename}`, {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!response.ok) throw new Error('Falha ao carregar imagem.');
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
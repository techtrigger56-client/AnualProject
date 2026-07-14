const session = requireAuth();
let ws = null;

function init() {
  document.getElementById('userName').textContent = session.collaborator.name;
  document.getElementById('userRole').textContent = session.collaborator.role;

  if (session.collaborator.role !== 'admin') {
    document.querySelectorAll('[data-admin-only]').forEach((el) => el.remove());
  }

  document.getElementById('profileName').value = session.collaborator.name;
  wireProfileForm();

  loadRelays();
  loadAccessLogs();
  loadEnvironment();
  loadSecurityEvents();
  loadPhotos();
  if (session.collaborator.role === 'admin') {
    loadCollaborators();
    wireAdminActions();
    wireEditCollabForm();
  }

  connectWebSocket();
}

// ---------- WebSocket ----------

function connectWebSocket() {
  ws = new WebSocket(CONFIG.WS_URL);

  ws.onopen = () => setWsIndicator(true);
  ws.onclose = () => {
    setWsIndicator(false);
    setTimeout(connectWebSocket, 3000);
  };
  ws.onerror = () => ws.close();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleRealtimeMessage(msg);
  };
}

function setWsIndicator(online) {
  const el = document.getElementById('wsIndicator');
  el.classList.toggle('online', online);
  el.classList.toggle('offline', !online);
}

function handleRealtimeMessage(msg) {
  switch (msg.type) {
    case 'acesso_alterado':
      loadAccessLogs();
      loadRelays();
      break;
    case 'leitura_ambiente':
      loadEnvironment();
      break;
    case 'evento_seguranca':
    case 'evento_resolvido':
      loadSecurityEvents();
      break;
    case 'nova_foto':
      loadPhotos();
      break;
  }
}

// ---------- Acesso / relés ----------

async function loadRelays() {
  const relays = await apiRequest('/relays');
  const container = document.getElementById('relayStatus');
  container.innerHTML = relays
    .map(
      (r) => `<span class="badge ${r.state === 'ligado' ? 'fail' : 'ok'}">
        ${r.relay_name}: ${r.state === 'ligado' ? 'Trancado' : 'Destrancado'}
      </span>`
    )
    .join('');
}

async function loadAccessLogs() {
  const logs = await apiRequest('/access/logs?limit=20');
  const body = document.getElementById('accessLogsBody');
  body.innerHTML = logs
    .map(
      (log) => `<tr>
        <td>${formatTime(log.timestamp)}</td>
        <td>${log.collaborator_id ?? '—'}</td>
        <td>${log.action}</td>
        <td><span class="badge ${log.success ? 'ok' : 'fail'}">${log.success ? 'sucesso' : 'falhou'}</span></td>
      </tr>`
    )
    .join('');
}

// ---------- Ambiente ----------

async function loadEnvironment() {
  const readings = await apiRequest('/environment?limit=20');
  const statsContainer = document.getElementById('envStats');
  const latest = readings[0];

  statsContainer.innerHTML = latest
    ? `
      <div class="env-stat"><div class="value">${latest.temperature ?? '—'}°C</div><div class="label">Temperatura</div></div>
      <div class="env-stat"><div class="value">${latest.humidity ?? '—'}%</div><div class="label">Humidade</div></div>
      <div class="env-stat"><div class="value">${latest.smoke_level ?? '—'}</div><div class="label">Fumo (MQ135)</div></div>
    `
    : '<p>Sem leituras ainda.</p>';

  const body = document.getElementById('envLogsBody');
  body.innerHTML = readings
    .map(
      (r) => `<tr>
        <td>${formatTime(r.timestamp)}</td>
        <td>${r.device_location}</td>
        <td>${r.temperature ?? '—'}</td>
        <td>${r.humidity ?? '—'}</td>
        <td>${r.smoke_level ?? '—'}</td>
      </tr>`
    )
    .join('');
}

// ---------- Segurança ----------

async function loadSecurityEvents() {
  const events = await apiRequest('/security/events');
  const body = document.getElementById('securityEventsBody');
  body.innerHTML = events
    .map(
      (ev) => `<tr>
        <td>${formatTime(ev.created_at)}</td>
        <td>${ev.type}</td>
        <td>${ev.description ?? '—'}</td>
        <td><span class="badge ${ev.severity}">${ev.severity}</span></td>
        <td>${ev.resolved ? 'Resolvido' : 'Ativo'}</td>
        <td>${
          !ev.resolved && session.collaborator.role === 'admin'
            ? `<button class="secondary" style="width:auto;padding:0.2rem 0.6rem;" onclick="resolveEvent(${ev.id})">Resolver</button>`
            : ''
        }</td>
      </tr>`
    )
    .join('');
}

async function resolveEvent(eventId) {
  await apiRequest(`/security/events/${eventId}/resolve`, { method: 'PATCH' });
  loadSecurityEvents();
}

function wireAdminActions() {
  document.getElementById('btnLockdown').addEventListener('click', async () => {
    if (!confirm('Confirmas ativar o LOCKDOWN? Todas as portas vão trancar.')) return;
    await apiRequest('/security/lockdown', { method: 'POST' });
    loadSecurityEvents();
    loadRelays();
  });

  document.getElementById('btnEvacuation').addEventListener('click', async () => {
    if (!confirm('Confirmas ativar EVACUAÇÃO? Todas as portas vão destrancar.')) return;
    await apiRequest('/security/evacuation', { method: 'POST' });
    loadSecurityEvents();
    loadRelays();
  });

  document.getElementById('collabForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('newName').value.trim();
    const rfidUid = document.getElementById('newRfid').value.trim();
    const password = document.getElementById('newPassword').value;
    const role = document.getElementById('newRole').value;

    try {
      await apiRequest('/collaborators', {
        method: 'POST',
        body: JSON.stringify({ name, rfidUid, password, role }),
      });
      e.target.reset();
      loadCollaborators();
    } catch (err) {
      alert(err.message);
    }
  });
}

// ---------- Edição de colaboradores (admin) ----------

function openEditForm(id, name, role) {
  document.getElementById('editId').value = id;
  document.getElementById('editName').value = name;
  document.getElementById('editRole').value = role;
  document.getElementById('editPassword').value = '';
  document.getElementById('editError').textContent = '';
  document.getElementById('editCollabForm').style.display = 'grid';
}

function wireEditCollabForm() {
  document.getElementById('btnCancelEdit').addEventListener('click', () => {
    document.getElementById('editCollabForm').style.display = 'none';
  });

  document.getElementById('editCollabForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('editError');
    errorEl.textContent = '';

    const id = document.getElementById('editId').value;
    const name = document.getElementById('editName').value.trim();
    const role = document.getElementById('editRole').value;
    const newPassword = document.getElementById('editPassword').value;

    try {
      await apiRequest(`/collaborators/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, role, newPassword: newPassword || undefined }),
      });
      document.getElementById('editCollabForm').style.display = 'none';
      loadCollaborators();
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

// ---------- Perfil próprio ----------

function wireProfileForm() {
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('profileError');
    errorEl.textContent = '';

    const newName = document.getElementById('profileName').value.trim();
    const newPassword = document.getElementById('profileNewPassword').value;
    const currentPassword = document.getElementById('profileCurrentPassword').value;

    try {
      const result = await apiRequest('/collaborators/me', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newName, newPassword: newPassword || undefined }),
      });

      session.collaborator.name = result.name;
      saveSession(session.token, session.collaborator);
      document.getElementById('userName').textContent = result.name;
      document.getElementById('profileCurrentPassword').value = '';
      document.getElementById('profileNewPassword').value = '';
    } catch (err) {
      errorEl.textContent = err.message;
    }
  });
}

// ---------- Fotos ----------

async function loadPhotos() {
  const photos = await apiRequest('/photos?limit=12');
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';

  for (const photo of photos) {
    const img = document.createElement('img');
    img.alt = photo.trigger_reason;
    img.title = `${photo.trigger_reason} — ${formatTime(photo.captured_at)}`;
    grid.appendChild(img);

    apiFetchImageUrl(photo.filename)
      .then((url) => { img.src = url; })
      .catch(() => { img.alt = 'Falha ao carregar'; });
  }
}

// ---------- Colaboradores ----------

async function loadCollaborators() {
  const collabs = await apiRequest('/collaborators');
  const body = document.getElementById('collabsBody');
  body.innerHTML = collabs
    .map(
      (c) => `<tr>
        <td>${c.name}</td>
        <td>${c.rfid_uid}</td>
        <td>${c.role}</td>
        <td>${c.active ? 'Ativo' : 'Inativo'}</td>
        <td style="white-space:nowrap;">
          <button class="secondary" style="width:auto;padding:0.2rem 0.6rem;" onclick="openEditForm(${c.id}, '${c.name.replace(/'/g, "\\'")}', '${c.role}')">Editar</button>
          ${
            c.active
              ? `<button class="secondary" style="width:auto;padding:0.2rem 0.6rem;" onclick="deactivateCollaborator(${c.id})">Desativar</button>`
              : ''
          }
        </td>
      </tr>`
    )
    .join('');
}

async function deactivateCollaborator(id) {
  if (!confirm('Confirmas desativar este colaborador?')) return;
  await apiRequest(`/collaborators/${id}/deactivate`, { method: 'PATCH' });
  loadCollaborators();
}

// ---------- Util ----------

function formatTime(isoString) {
  return new Date(isoString).toLocaleString('pt-PT', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

init();

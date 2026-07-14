const env = require('../config/env');

async function sendRelayCommand(relayName, state) {
  try {
    const response = await fetch(`http://${env.esp32AccessIp}/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relay: relayName, state }),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Falha ao comunicar com ESP32 (acesso): ${err.message}`);
    return null; // estado já gravado na BD; falha de rede não bloqueia o fluxo
  }
}

async function requestPhotoCapture(reason) {
  if (!env.esp32CamIp) return null;
  try {
    const response = await fetch(`http://${env.esp32CamIp}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    return await response.json();
  } catch (err) {
    console.error(`Falha ao comunicar com ESP32-CAM: ${err.message}`);
    return null;
  }
}

module.exports = { sendRelayCommand, requestPhotoCapture };

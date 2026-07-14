const env = require('../config/env');

// Autenticação dos próprios ESP32 (não confundir com JWT humano).
// Os dispositivos não fazem "login" — apresentam uma chave fixa,
// partilhada entre o ESP32 de acesso e o ESP32-CAM.
function deviceAuth(req, res, next) {
  const key = req.headers['x-device-key'];
  if (!key || key !== env.deviceApiKey) {
    return res.status(401).json({ error: 'Chave de dispositivo inválida ou ausente.' });
  }
  next();
}

module.exports = deviceAuth;

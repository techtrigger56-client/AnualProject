require('dotenv').config();

const REQUIRED_VARS = [
  'PORT',
  'DB_PATH',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'ESP32_ACCESS_IP',
  'DEVICE_API_KEY',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente em falta: ${missing.join(', ')}.`);
  }
  if (Number.isNaN(Number(process.env.PORT))) {
    throw new Error('PORT tem de ser um número válido.');
  }
  if (process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET é demasiado curto (mínimo 16 caracteres).');
  }
  if (process.env.DEVICE_API_KEY.length < 16) {
    throw new Error('DEVICE_API_KEY é demasiado curto (mínimo 16 caracteres).');
  }
}

validateEnv();

module.exports = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: process.env.DB_PATH,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  esp32AccessIp: process.env.ESP32_ACCESS_IP,
  esp32CamIp: process.env.ESP32_CAM_IP || null,
  deviceApiKey: process.env.DEVICE_API_KEY,
};

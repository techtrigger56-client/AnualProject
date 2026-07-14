# Smart Enterprise System — Backend

## Setup

1. npm install
2. cp .env.example .env   (preenche os valores reais)
3. npm run migrate        (cria a base de dados e o esquema)
4. npm run seed:admin -- <rfidUid> <password> <nome>
5. npm start

## Autenticação

- Dashboard / colaboradores: JWT (Authorization: Bearer <token>),
  obtido via POST /api/auth/login
- ESP32 (acesso, sensores, câmara): header x-device-key,
  valor definido em DEVICE_API_KEY no .env

## Endpoints principais

POST /api/auth/login
GET  /api/collaborators            (admin)
POST /api/collaborators            (admin)
POST /api/access/toggle            (ESP32, x-device-key)
GET  /api/access/logs              (autenticado)
POST /api/environment              (ESP32, x-device-key)
GET  /api/environment              (autenticado)
POST /api/security/lockdown        (admin)
POST /api/security/evacuation      (admin)
PATCH /api/security/events/:id/resolve (admin)
POST /api/photos                   (ESP32-CAM, x-device-key)
GET  /api/photos                   (autenticado)
GET  /api/relays                   (autenticado)

#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <Keypad.h>
#include <DHT.h>
#include <WiFi.h>
#include <HTTPClient.h>

// ---------- WiFi e Servidor ----------
const char* WIFI_SSID     = "PA2026";
const char* WIFI_PASSWORD = "projetoanual2026";
const char* SERVER_URL    = "http://192.168.1.150:3000"; // IP estático do teu telemóvel

// ---------- Pinos ----------
#define RFID_SS    5
#define RFID_SCK   18
#define RFID_MISO  19
#define RFID_MOSI  23
#define SERVO_PIN  16
#define PIR_PIN    21
#define DHT_PIN    22
#define FLAME_PIN  15
#define BUZZER_PIN 2
#define LDR_PIN    34
#define MQ135_PIN  35
#define DHTTYPE    DHT11

// ---------- Constantes de comportamento (ajusta com os valores dos teus testes) ----------
#define ANGULO_TRANCADO      0
#define ANGULO_DESTRANCADO   90
#define FLAME_DETECTED_STATE HIGH  // troca para LOW se foi essa a polaridade no teu teste
#define LDR_DARK_THRESHOLD   1500  // ajusta conforme o teu ambiente

// ---------- Protótipos ----------
void checkFire();
void checkAccess();
void checkCommands();
void sendEnvironmentPeriodically();
void submitAccess(String uid, String password);
void reportSecurityEvent(String type);

// ---------- Objetos ----------
MFRC522 rfid(RFID_SS, MFRC522::UNUSED_PIN);
Servo   lockServo;
DHT     dht(DHT_PIN, DHTTYPE);

const byte ROWS = 4, COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'}, {'4','5','6','B'},
  {'7','8','9','C'}, {'*','0','#','D'}
};
byte rowPins[ROWS] = {13, 14, 27, 26};
byte colPins[COLS] = {25, 33, 32, 4};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ---------- Estado não-bloqueante ----------
bool fireAlarmActive = false;

String enteredPassword           = "";
String pendingUid                = "";
bool awaitingPassword            = false;
unsigned long passwordPromptStart = 0;
const unsigned long PASSWORD_TIMEOUT = 15000;

unsigned long lastEnvSend        = 0;
const unsigned long ENV_INTERVAL = 30000;

bool selamentoActive             = false;
bool evacuacaoActive             = false;
unsigned long lastCommandCheck   = 0;
const unsigned long COMMAND_INTERVAL = 5000;

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);

  SPI.begin(RFID_SCK, RFID_MISO, RFID_MOSI, RFID_SS);
  rfid.PCD_Init();

  lockServo.setPeriodHertz(50);
  lockServo.attach(SERVO_PIN, 500, 2400);
  lockServo.write(ANGULO_TRANCADO);

  pinMode(PIR_PIN, INPUT);
  pinMode(FLAME_PIN, INPUT);
  dht.begin();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("A ligar ao WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" ligado! IP: " + WiFi.localIP().toString());
}

// ---------- Loop ----------
void loop() {
  checkFire();
  checkCommands();
  checkAccess();
  sendEnvironmentPeriodically();
}

// ---------- Incêndio — prioridade absoluta, reação 100% local ----------
void checkFire() {
  bool flameDetected = digitalRead(FLAME_PIN) == FLAME_DETECTED_STATE;

  if (flameDetected && !fireAlarmActive) {
    fireAlarmActive = true;
    lockServo.write(ANGULO_DESTRANCADO); // override imediato, sem esperar servidor
    tone(BUZZER_PIN, 1000);
    Serial.println("INCENDIO DETETADO — destrancado, alarme ativo");
    reportSecurityEvent("fire");
  }

  if (!flameDetected && fireAlarmActive) {
    fireAlarmActive = false;
    noTone(BUZZER_PIN);
    Serial.println("Alarme de incendio cessado");
    // porta fica destrancada até ação manual do admin no dashboard
  }
}

// ---------- Polling de comandos do servidor (selamento / evacuação) ----------
void checkCommands() {
  if (millis() - lastCommandCheck < COMMAND_INTERVAL) return;
  lastCommandCheck = millis();
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/security/commands");
  int code = http.GET();

  if (code == 200) {
    String body = http.getString();
    selamentoActive = body.indexOf("\"selamento\":true") >= 0;
    evacuacaoActive = body.indexOf("\"evacuacao\":true") >= 0;

    // incêndio tem sempre prioridade — só aplica selamento/evacuação se não houver alarme
    if (!fireAlarmActive) {
      if (evacuacaoActive) {
        lockServo.write(ANGULO_DESTRANCADO);
      } else if (selamentoActive) {
        lockServo.write(ANGULO_TRANCADO);
      }
    }
  }
  http.end();
}

// ---------- Controlo de acesso ----------
void checkAccess() {
  if (fireAlarmActive) return;  // incêndio trava tudo
  if (selamentoActive) return;  // selamento bloqueia novas passagens

  // timeout da senha pendente
  if (awaitingPassword && millis() - passwordPromptStart > PASSWORD_TIMEOUT) {
    Serial.println("Tempo esgotado para digitar a senha");
    awaitingPassword = false;
    pendingUid       = "";
    enteredPassword  = "";
  }

  // se está à espera de senha, só processa teclado
  if (awaitingPassword) {
    char key = keypad.getKey();
    if (key) {
      if (key == '#') {
        submitAccess(pendingUid, enteredPassword);
        awaitingPassword = false;
        enteredPassword  = "";
        pendingUid       = "";
      } else if (key == '*') {
        enteredPassword = "";
        Serial.println("Senha apagada — digita de novo e termina com #");
      } else {
        enteredPassword += key;
      }
    }
    return;
  }

  // escuta RFID
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  rfid.PICC_HaltA();

  submitAccess(uid, "");
}

void submitAccess(String uid, String password) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Sem WiFi — acesso nao processado");
    return;
  }

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/access");
  http.addHeader("Content-Type", "application/json");

  String body = "{\"rfid_uid\":\"" + uid + "\"";
  if (password.length() > 0) body += ",\"password\":\"" + password + "\"";
  body += "}";

  int httpCode = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.println("Resposta: " + response);

  if (response.indexOf("password_required") >= 0) {
    pendingUid          = uid;
    awaitingPassword    = true;
    passwordPromptStart = millis();
    Serial.println("Digita a senha e pressiona #");

  } else if (response.indexOf("\"granted\"") >= 0) {
    bool isEntrada = response.indexOf("\"entrada\"") >= 0;
    lockServo.write(ANGULO_DESTRANCADO);
    tone(BUZZER_PIN, 2000, 300);
    Serial.println(isEntrada ? "ENTRADA liberada" : "SAIDA liberada");
    delay(3000); // tempo para a pessoa passar — único delay aceitável aqui
    lockServo.write(ANGULO_TRANCADO);

  } else {
    tone(BUZZER_PIN, 400, 500);
    Serial.println("Acesso negado");
  }
}

// ---------- Dados ambientais — envio periódico ----------
void sendEnvironmentPeriodically() {
  if (millis() - lastEnvSend < ENV_INTERVAL) return;
  lastEnvSend = millis();
  if (WiFi.status() != WL_CONNECTED) return;

  float temp     = dht.readTemperature();
  float hum      = dht.readHumidity();
  int light      = analogRead(LDR_PIN);
  int airQuality = analogRead(MQ135_PIN);

  if (isnan(temp) || isnan(hum)) {
    Serial.println("Falha na leitura do DHT11 — ambiente nao enviado");
    return;
  }

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/environment");
  http.addHeader("Content-Type", "application/json");

  String body = "{\"temperature\":"  + String(temp)       +
                ",\"humidity\":"     + String(hum)        +
                ",\"air_quality\":"  + String(airQuality) +
                ",\"light\":"        + String(light)      + "}";

  http.POST(body);
  http.end();
  Serial.println("Dados ambientais enviados");
}

// ---------- Eventos de segurança ----------
void reportSecurityEvent(String type) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/security/events");
  http.addHeader("Content-Type", "application/json");
  String body = "{\"type\":\"" + type + "\"}";
  http.POST(body);
  http.end();
}
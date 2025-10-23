# Configuración de WhatsApp 📱

Esta guía te ayudará a configurar el agente para funcionar con WhatsApp usando whatsapp-web.js.

## ⚠️ Importante

Esta integración usa **WhatsApp Web** (no la API oficial de WhatsApp Business). Para uso en producción a gran escala, considera usar la [WhatsApp Business API oficial](https://developers.facebook.com/docs/whatsapp).

## Prerequisitos

- Cuenta de WhatsApp
- Número de teléfono dedicado para el bot (recomendado)
- Servidor con Node.js instalado

## Paso 1: Preparar el Entorno

### Instalar Dependencias del Sistema

#### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgcc1 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  ca-certificates \
  fonts-liberation \
  libappindicator1 \
  libnss3 \
  lsb-release \
  xdg-utils \
  wget \
  chromium-browser
```

#### macOS
```bash
# Chromium se instala automáticamente con puppeteer
brew install --cask google-chrome
```

## Paso 2: Configurar Variables de Entorno

```env
# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./whatsapp-session

# Agent Configuration
GEMINI_API_KEY=your_gemini_api_key
GA4_PROPERTY_ID=your_ga4_property_id
GA4_CREDENTIALS_PATH=./credentials/ga4-credentials.json
GOOGLE_ADS_CUSTOMER_ID=your_customer_id
# ... otras variables
```

## Paso 3: Ejecutar el Bot por Primera Vez

1. **Iniciar el bot**:
   ```bash
   npm run start:whatsapp
   ```

2. **Escanear el código QR**:
   - Aparecerá un código QR en la terminal
   - Abre WhatsApp en tu teléfono
   - Ve a Ajustes > Dispositivos vinculados
   - Toca "Vincular un dispositivo"
   - Escanea el código QR mostrado en la terminal

3. **Confirmar vinculación**:
   ```
   [WhatsApp] WhatsApp client authenticated successfully
   [WhatsApp] WhatsApp client is ready!
   ```

## Paso 4: Probar el Bot

1. **Enviar mensaje al bot**:
   - Desde otro teléfono, envía un mensaje al número vinculado
   - O envíate un mensaje a ti mismo

2. **Probar comandos**:
   ```
   /start
   ```

3. **Probar health check**:
   ```
   /healthcheck
   ```

   Responde con:
   ```
   Mi Empresa
   ```

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/start` o `/help` | Ver ayuda y comandos |
| `/healthcheck` | Auditoría completa (GA4 + Ads + Meta) |
| `/ga4` | Solo auditoría de GA4 |
| `/googleads` | Solo auditoría de Google Ads |
| `/meta` | Solo auditoría de Meta Ads |

## Ejecución en Producción

### Opción A: PM2 (Recomendado para Servidores)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar bot
pm2 start dist/integrations/whatsapp.js --name marketing-agent-whatsapp

# Ver logs
pm2 logs marketing-agent-whatsapp

# Monitoreo
pm2 monit

# Autostart en reinicio
pm2 startup
pm2 save

# Reiniciar
pm2 restart marketing-agent-whatsapp
```

### Opción B: Docker

**Dockerfile.whatsapp**:
```dockerfile
FROM node:18-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY marketing-agent/package*.json ./marketing-agent/

# Install dependencies
RUN npm install
RUN cd marketing-agent && npm install

# Copy source
COPY . .

# Build
RUN npm run build

# Volume for WhatsApp session
VOLUME ["/app/whatsapp-session"]

# Environment
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["node", "dist/integrations/whatsapp.js"]
```

**Ejecutar**:
```bash
# Build
docker build -f Dockerfile.whatsapp -t marketing-agent-whatsapp .

# Run (primera vez para vincular)
docker run -it \
  --name marketing-agent-whatsapp \
  -v $(pwd)/whatsapp-session:/app/whatsapp-session \
  --env-file .env \
  marketing-agent-whatsapp

# Después de vincular, ejecutar en background
docker run -d \
  --name marketing-agent-whatsapp \
  -v $(pwd)/whatsapp-session:/app/whatsapp-session \
  --env-file .env \
  --restart unless-stopped \
  marketing-agent-whatsapp
```

### Opción C: Servidor VPS

1. **Conectar al servidor**:
   ```bash
   ssh user@your-server.com
   ```

2. **Clonar repositorio**:
   ```bash
   git clone <your-repo>
   cd marketing-agent
   ```

3. **Configurar**:
   ```bash
   npm install
   npm run build
   cp .env.example .env
   # Editar .env con tus credenciales
   ```

4. **Primera ejecución** (para QR):
   ```bash
   # En una sesión de screen o tmux
   screen -S whatsapp
   npm run start:whatsapp
   # Escanear QR
   # Ctrl+A, D para detach
   ```

5. **Configurar PM2**:
   ```bash
   pm2 start dist/integrations/whatsapp.js --name whatsapp-agent
   pm2 save
   pm2 startup
   ```

## Gestión de Sesiones

### Guardar Sesión

La sesión se guarda automáticamente en `whatsapp-session/`:
```
whatsapp-session/
├── session-<phone-number>/
│   ├── Default/
│   └── ...
```

### Backup de Sesión

```bash
# Crear backup
tar -czf whatsapp-session-backup.tar.gz whatsapp-session/

# Restaurar backup
tar -xzf whatsapp-session-backup.tar.gz
```

### Re-autenticación

Si pierdes la sesión:
```bash
# Detener el bot
pm2 stop marketing-agent-whatsapp

# Eliminar sesión antigua
rm -rf whatsapp-session/

# Reiniciar (te pedirá escanear QR nuevamente)
pm2 start marketing-agent-whatsapp
pm2 logs marketing-agent-whatsapp
```

## Características Avanzadas

### Mensajes Multimedia

El bot puede enviar imágenes, documentos, etc:

```typescript
// Enviar imagen
await message.reply(new MessageMedia(
  'image/png',
  base64Data,
  'report.png'
));

// Enviar PDF
await message.reply(new MessageMedia(
  'application/pdf',
  base64Pdf,
  'health-check-report.pdf'
));
```

### Filtrar Contactos

Permitir solo ciertos números:

```typescript
const ALLOWED_NUMBERS = process.env.ALLOWED_WHATSAPP_NUMBERS?.split(',') || [];

whatsappClient.on('message', async (message: Message) => {
  if (ALLOWED_NUMBERS.length > 0 && !ALLOWED_NUMBERS.includes(message.from)) {
    return message.reply('Lo siento, no tienes autorización para usar este bot.');
  }
  // ... resto del código
});
```

### Grupos de WhatsApp

Activar soporte para grupos:

```typescript
whatsappClient.on('message', async (message: Message) => {
  const chat = await message.getChat();

  // Permitir grupos
  if (chat.isGroup) {
    // Verificar que el mensaje mencione al bot
    if (!message.body.includes('@bot')) {
      return;
    }
  }

  // ... procesar mensaje
});
```

## Monitoreo

### Logs

```bash
# Ver logs en tiempo real
pm2 logs marketing-agent-whatsapp

# Logs de las últimas 100 líneas
pm2 logs marketing-agent-whatsapp --lines 100

# Logs de errores solamente
pm2 logs marketing-agent-whatsapp --err
```

### Health Check

Implementar endpoint de salud:

```typescript
import express from 'express';

const app = express();

app.get('/health', (req, res) => {
  const isReady = whatsappClient.info?.wid?._serialized;
  res.json({
    status: isReady ? 'healthy' : 'initializing',
    uptime: process.uptime(),
  });
});

app.listen(3001);
```

### Alertas

Configurar alertas cuando el bot se desconecte:

```typescript
whatsappClient.on('disconnected', async (reason) => {
  logger.error('WhatsApp disconnected:', reason);

  // Enviar alerta por email, Slack, etc.
  await sendAlert('WhatsApp bot disconnected: ' + reason);

  // Intentar reconectar
  setTimeout(() => {
    whatsappClient.initialize();
  }, 5000);
});
```

## Troubleshooting

### Error: "Protocol error (Target.createTarget)"

Este error suele ocurrir en servidores sin interfaz gráfica.

Solución:
```bash
# Instalar dependencias faltantes
sudo apt-get install -y xvfb

# Ejecutar con Xvfb
xvfb-run -a --server-args="-screen 0 1280x720x24" npm run start:whatsapp
```

### Error: "Execution context was destroyed"

Esto ocurre cuando la sesión se pierde.

Solución:
```bash
# Eliminar sesión y reiniciar
rm -rf whatsapp-session/
pm2 restart marketing-agent-whatsapp
```

### Bot deja de responder

1. Verificar que el proceso esté corriendo:
   ```bash
   pm2 list
   ```

2. Ver logs para errores:
   ```bash
   pm2 logs marketing-agent-whatsapp --err
   ```

3. Reiniciar:
   ```bash
   pm2 restart marketing-agent-whatsapp
   ```

### Problemas de memoria

WhatsApp Web puede consumir mucha memoria. Configurar límites:

```bash
# PM2 con límite de memoria
pm2 start dist/integrations/whatsapp.js \
  --name marketing-agent-whatsapp \
  --max-memory-restart 1G
```

### QR Code no aparece

1. Verificar que la terminal soporte códigos QR
2. Usar alternativa:
   ```typescript
   whatsappClient.on('qr', (qr) => {
     // Generar URL
     const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}`;
     console.log('QR URL:', qrUrl);
   });
   ```

## Limitaciones

1. **No es la API oficial**: Esta solución usa WhatsApp Web, no la API de WhatsApp Business
2. **Sesión única**: Solo un dispositivo puede estar conectado a la vez
3. **Rate limits**: WhatsApp puede limitar o banear si detecta uso excesivo
4. **Mantenimiento**: Requiere re-autenticación ocasional

## Para Producción a Gran Escala

Considera usar la [WhatsApp Business API oficial](https://developers.facebook.com/docs/whatsapp):

**Ventajas**:
- Más estable y confiable
- Soportado oficialmente
- Mejor para alto volumen
- Webhooks nativos

**Desventajas**:
- Requiere aprobación de Facebook
- Costos por mensaje
- Proceso de setup más complejo

## Recursos Adicionales

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Puppeteer Troubleshooting](https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md)

## Siguiente Paso

- [Ver guía de despliegue completa](DEPLOYMENT.md)
- [Personalizar el checklist](CUSTOMIZATION.md)
- [Troubleshooting general](TROUBLESHOOTING.md)

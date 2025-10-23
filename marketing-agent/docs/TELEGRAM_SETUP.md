# Configuración de Telegram 🤖

Esta guía te ayudará a configurar el agente para funcionar con Telegram.

## Prerequisitos

- Cuenta de Telegram
- Número de teléfono válido

## Paso 1: Crear Bot en Telegram

1. **Abrir BotFather**:
   - Busca `@BotFather` en Telegram
   - O abre: https://t.me/botfather

2. **Crear nuevo bot**:
   ```
   /newbot
   ```

3. **Configurar nombre**:
   ```
   Marketing Health Check Agent
   ```

4. **Configurar username** (debe terminar en 'bot'):
   ```
   marketing_healthcheck_bot
   ```

5. **Guardar el token**:
   - BotFather te dará un token como: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`
   - **Guárdalo de forma segura** - es la credential de tu bot

## Paso 2: Configurar Variables de Entorno

Agrega el token a tu archivo `.env`:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

## Paso 3: Personalizar el Bot

Vuelve a BotFather y configura los detalles de tu bot:

### Configurar Descripción

```
/setdescription @marketing_healthcheck_bot
```

Luego envía:
```
Consultor de marketing digital especializado en auditorías de GA4, Google Ads y Meta Ads.

Puedo ayudarte a:
• Realizar health checks completos
• Evaluar nivel de madurez de tus plataformas
• Proporcionar recomendaciones accionables

Comandos: /start /help /healthcheck
```

### Configurar Descripción Corta

```
/setabouttext @marketing_healthcheck_bot
```

Luego envía:
```
Consultor de marketing digital con IA. Auditorías de GA4, Google Ads y Meta Ads.
```

### Configurar Comandos

```
/setcommands @marketing_healthcheck_bot
```

Luego envía:
```
start - Iniciar el bot
help - Ver ayuda y comandos
healthcheck - Auditoría completa de todas las plataformas
ga4 - Auditar solo Google Analytics 4
googleads - Auditar solo Google Ads
meta - Auditar solo Meta Ads
```

### Configurar Imagen de Perfil (Opcional)

```
/setuserpic @marketing_healthcheck_bot
```

Luego sube una imagen (512x512 px recomendado)

## Paso 4: Ejecutar el Bot

### Opción A: Ejecución Local

```bash
npm run start:telegram
```

El bot comenzará a escuchar mensajes. Los logs mostrarán:
```
[Telegram] Telegram bot started successfully
[Telegram] Bot username: @marketing_healthcheck_bot
```

### Opción B: Usando PM2 (Producción Local)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar bot
pm2 start dist/integrations/telegram.js --name marketing-agent-telegram

# Ver logs
pm2 logs marketing-agent-telegram

# Configurar autostart
pm2 startup
pm2 save
```

### Opción C: Docker

```bash
# Build
docker build -t marketing-agent-telegram -f Dockerfile.telegram .

# Run
docker run -d \
  --name marketing-agent-telegram \
  --env-file .env \
  --restart unless-stopped \
  marketing-agent-telegram
```

### Opción D: Cloud (Google Cloud Run, AWS ECS, etc.)

Ver [DEPLOYMENT.md](DEPLOYMENT.md) para instrucciones detalladas.

## Paso 5: Probar el Bot

1. **Abrir Telegram**

2. **Buscar tu bot**: `@marketing_healthcheck_bot` (o el username que elegiste)

3. **Iniciar conversación**:
   ```
   /start
   ```

4. **Probar health check**:
   ```
   /healthcheck
   ```

   Luego responde con el nombre del cliente:
   ```
   Mi Empresa S.A.
   ```

## Comandos del Bot

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/start` | Iniciar bot y ver bienvenida | `/start` |
| `/help` | Ver ayuda completa | `/help` |
| `/healthcheck` | Auditoría completa (GA4 + Ads + Meta) | `/healthcheck` → `Cliente X` |
| `/ga4` | Solo auditoría de GA4 | `/ga4` → `Cliente Y` |
| `/googleads` | Solo auditoría de Google Ads | `/googleads` → `Cliente Z` |
| `/meta` | Solo auditoría de Meta Ads | `/meta` → `Cliente W` |

## Flujo de Uso

### Health Check Completo

```
Usuario: /healthcheck
Bot: 🔍 Iniciando Health Check Completo
     Por favor, envíame el nombre del cliente a analizar.

Usuario: Acme Corporation
Bot: ✨ Perfecto! Comenzando análisis para Acme Corporation...
     Esto puede tomar unos minutos. Te notificaré cuando esté listo.

[Bot realiza el análisis...]

Bot: 📊 HEALTH CHECK REPORT
     Cliente: Acme Corporation

     PUNTUACIÓN TOTAL
     78/100 🟢
     Nivel: Avanzado

     DESGLOSE POR PLATAFORMA

     🟢 Google Analytics 4
     Puntuación: 82/100 (82%)
     Nivel: Avanzado
     ...
```

### Chat Conversacional

```
Usuario: ¿Cuáles son las mejores prácticas para configurar conversiones en GA4?

Bot: Las mejores prácticas para configurar conversiones en GA4 incluyen:

     1. Definir conversiones claras...
     2. Usar eventos personalizados...
     ...
```

## Variables de Entorno

```env
# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Agent Configuration (requeridas)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash-exp

# GA4 (si usas auditoría de GA4)
GA4_PROPERTY_ID=your_property_id
GA4_CREDENTIALS_PATH=./credentials/ga4-credentials.json

# Google Ads (si usas auditoría de Google Ads)
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=your_customer_id

# Meta (si usas auditoría de Meta)
META_ACCESS_TOKEN=your_access_token
META_APP_ID=your_app_id

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/agent.log
```

## Características Avanzadas

### Webhooks (Recomendado para Producción)

En lugar de polling, usa webhooks para mejor rendimiento:

1. **Configurar webhook**:
   ```typescript
   // En src/integrations/telegram.ts
   bot.launch({
     webhook: {
       domain: 'https://your-domain.com',
       port: 8443,
     }
   });
   ```

2. **Configurar en BotFather**:
   ```bash
   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
     -d "url=https://your-domain.com/telegram-webhook"
   ```

### Botones Interactivos

Personaliza para agregar botones:

```typescript
await ctx.reply('Selecciona plataforma:', {
  reply_markup: {
    inline_keyboard: [
      [{ text: 'GA4', callback_data: 'platform_ga4' }],
      [{ text: 'Google Ads', callback_data: 'platform_gads' }],
      [{ text: 'Meta Ads', callback_data: 'platform_meta' }],
      [{ text: 'Todas', callback_data: 'platform_all' }],
    ]
  }
});
```

### Almacenamiento de Sesiones

Para persistir conversaciones:

```typescript
import { session } from 'telegraf';

bot.use(session());
```

## Monitoreo y Logs

### Ver logs en tiempo real

```bash
# Local
tail -f logs/agent.log

# PM2
pm2 logs marketing-agent-telegram

# Docker
docker logs -f marketing-agent-telegram
```

### Configurar alertas

Usa servicios como:
- [UptimeRobot](https://uptimerobot.com/) - Monitoreo de uptime
- [Sentry](https://sentry.io/) - Error tracking
- [Datadog](https://www.datadoghq.com/) - Monitoreo completo

## Troubleshooting

### El bot no responde

1. Verifica que el token sea correcto:
   ```bash
   curl https://api.telegram.org/bot<TOKEN>/getMe
   ```

2. Revisa que el proceso esté corriendo:
   ```bash
   ps aux | grep telegram
   ```

3. Verifica las credenciales de Gemini y plataformas

### Error: "Conflict: terminated by other getUpdates request"

Esto significa que hay otra instancia del bot corriendo.

Solución:
```bash
# Detener todas las instancias
pm2 delete all
# o
pkill -f telegram.js

# Reiniciar
npm run start:telegram
```

### Rate Limiting

Telegram tiene límites:
- 30 mensajes por segundo por bot
- 1 mensaje por segundo a un mismo usuario

Implementa throttling si es necesario:
```typescript
import { Telegraf } from 'telegraf';
import rateLimit from 'telegraf-ratelimit';

const limitConfig = {
  window: 1000, // 1 segundo
  limit: 1, // 1 mensaje
};

bot.use(rateLimit(limitConfig));
```

## Seguridad

1. **Nunca compartas tu bot token**
2. **Usa HTTPS** para webhooks
3. **Valida usuarios** en producción:
   ```typescript
   const ALLOWED_USERS = process.env.ALLOWED_USER_IDS?.split(',') || [];

   bot.use((ctx, next) => {
     if (!ALLOWED_USERS.includes(ctx.from?.id.toString())) {
       return ctx.reply('No autorizado');
     }
     return next();
   });
   ```

## Recursos Adicionales

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraf Documentation](https://telegraf.js.org/)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)

## Siguiente Paso

- [Configurar WhatsApp](WHATSAPP_SETUP.md)
- [Ver guía de despliegue](DEPLOYMENT.md)
- [Personalizar checklist](CUSTOMIZATION.md)

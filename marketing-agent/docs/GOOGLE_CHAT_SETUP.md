# Configuración de Google Chat 💬

Esta guía te ayudará a configurar el agente para funcionar con Google Chat.

## Prerequisitos

- Acceso a Google Cloud Platform
- Permisos para crear proyectos y habilitar APIs
- Dominio verificado (para producción) o acceso de prueba

## Paso 1: Configurar Proyecto en Google Cloud

1. **Crear/Seleccionar Proyecto**:
   ```bash
   gcloud projects create marketing-agent-chat
   gcloud config set project marketing-agent-chat
   ```

2. **Habilitar APIs necesarias**:
   ```bash
   gcloud services enable chat.googleapis.com
   gcloud services enable cloudresourcemanager.googleapis.com
   ```

## Paso 2: Crear Aplicación de Google Chat

1. Ve a [Google Chat API](https://console.cloud.google.com/apis/api/chat.googleapis.com)

2. Haz clic en "Configuración" en el menú lateral

3. Completa la configuración de la app:

   **Nombre de la app**: Marketing Health Check Agent

   **URL del avatar**: (URL de una imagen para el bot)

   **Descripción**:
   ```
   Consultor de marketing digital especializado en auditorías de GA4, Google Ads y Meta Ads
   ```

4. **Funcionalidad interactiva**:
   - Selecciona "Recibir mensajes 1:1"
   - Selecciona "Unirse a espacios y conversaciones grupales"

5. **URL de conexión**:
   ```
   https://your-domain.com/
   ```
   (Actualizarás esto después del despliegue)

6. **Permisos**:
   - Marca "Los usuarios pueden @mencionar al bot"
   - Marca "El bot funciona en mensajes directos"
   - Marca "El bot funciona en espacios"

## Paso 3: Configurar Credenciales

1. **Crear cuenta de servicio**:
   ```bash
   gcloud iam service-accounts create marketing-agent-chat \
     --display-name="Marketing Agent Chat Bot"
   ```

2. **Descargar credenciales**:
   ```bash
   gcloud iam service-accounts keys create credentials/google-chat-credentials.json \
     --iam-account=marketing-agent-chat@marketing-agent-chat.iam.gserviceaccount.com
   ```

3. **Configurar en .env**:
   ```env
   GOOGLE_CHAT_PROJECT_ID=marketing-agent-chat
   GOOGLE_CHAT_CREDENTIALS_PATH=./credentials/google-chat-credentials.json
   GOOGLE_CHAT_PORT=8080
   ```

## Paso 4: Desplegar la Aplicación

### Opción A: Despliegue Local (Desarrollo)

1. **Instalar ngrok** (para exponer tu servidor local):
   ```bash
   npm install -g ngrok
   ```

2. **Ejecutar el servidor**:
   ```bash
   npm run start:google-chat
   ```

3. **Exponer con ngrok** (en otra terminal):
   ```bash
   ngrok http 8080
   ```

4. **Actualizar URL en Google Chat API**:
   - Copia la URL HTTPS de ngrok (ej: `https://abc123.ngrok.io`)
   - Ve a la configuración de tu app en Google Chat API
   - Actualiza la "URL de conexión" con la URL de ngrok

### Opción B: Despliegue en Cloud Run (Producción)

1. **Crear Dockerfile** (ya incluido en el proyecto)

2. **Build y Deploy**:
   ```bash
   # Build
   gcloud builds submit --tag gcr.io/marketing-agent-chat/google-chat-integration

   # Deploy
   gcloud run deploy marketing-agent-google-chat \
     --image gcr.io/marketing-agent-chat/google-chat-integration \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GEMINI_API_KEY=${GEMINI_API_KEY} \
     --set-env-vars GA4_PROPERTY_ID=${GA4_PROPERTY_ID} \
     --set-env-vars GOOGLE_ADS_CUSTOMER_ID=${GOOGLE_ADS_CUSTOMER_ID}
   ```

3. **Actualizar URL**:
   - Copia la URL del servicio desplegado
   - Actualiza la "URL de conexión" en Google Chat API

## Paso 5: Configurar Permisos

1. **Dar acceso al bot**:
   ```bash
   gcloud projects add-iam-policy-binding marketing-agent-chat \
     --member=serviceAccount:marketing-agent-chat@marketing-agent-chat.iam.gserviceaccount.com \
     --role=roles/chat.owner
   ```

## Paso 6: Publicar el Bot

### Para Uso Interno (Organización)

1. Ve a la configuración de la app
2. En "Visibilidad", selecciona "Disponible para usuarios específicos en tu organización"
3. Agrega los usuarios o grupos que pueden usar el bot

### Para Uso Público

1. Completa el proceso de verificación de Google
2. Envía la app para revisión
3. Una vez aprobada, estará disponible en el marketplace

## Paso 7: Probar el Bot

1. **Abrir Google Chat**: [chat.google.com](https://chat.google.com)

2. **Buscar el bot**: Busca "Marketing Health Check Agent"

3. **Iniciar conversación**:
   ```
   Hola
   ```

4. **Probar health check**:
   ```
   /healthcheck Mi Empresa
   ```

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `/healthcheck [cliente]` | Inicia auditoría completa |
| `Pregunta directa` | Chat conversacional sobre marketing |

## Variables de Entorno

```env
# Google Chat Configuration
GOOGLE_CHAT_PROJECT_ID=your_project_id
GOOGLE_CHAT_CREDENTIALS_PATH=./credentials/google-chat-credentials.json
GOOGLE_CHAT_PORT=8080

# Agent Configuration
GEMINI_API_KEY=your_gemini_api_key
GA4_PROPERTY_ID=your_ga4_property_id
GA4_CREDENTIALS_PATH=./credentials/ga4-credentials.json
GOOGLE_ADS_CUSTOMER_ID=your_customer_id
# ... otras variables
```

## Troubleshooting

### El bot no responde

1. Verifica que el servidor esté corriendo:
   ```bash
   curl http://localhost:8080/health
   ```

2. Revisa los logs:
   ```bash
   # Local
   tail -f logs/agent.log

   # Cloud Run
   gcloud run logs read marketing-agent-google-chat
   ```

### Error de autenticación

1. Verifica que las credenciales sean correctas
2. Confirma que la cuenta de servicio tenga los permisos necesarios
3. Revisa que las APIs estén habilitadas

### Webhook no recibe eventos

1. Verifica que la URL de conexión sea correcta
2. Asegúrate que la URL sea HTTPS
3. Confirma que el servicio esté público (allow-unauthenticated)

## Mejores Prácticas

1. **Usa Secret Manager** para credenciales en producción:
   ```bash
   gcloud secrets create gemini-api-key --data-file=-
   # Pega tu API key y presiona Ctrl+D
   ```

2. **Configura alertas** para monitorear el bot:
   ```bash
   gcloud alpha monitoring policies create \
     --notification-channels=CHANNEL_ID \
     --display-name="Chat Bot Down" \
     --condition-display-name="Uptime check failed"
   ```

3. **Implementa rate limiting** para evitar abuso

4. **Mantén logs detallados** para debugging

## Recursos Adicionales

- [Google Chat API Documentation](https://developers.google.com/chat)
- [Building Chat Bots](https://developers.google.com/chat/how-tos/bots-develop)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)

## Siguiente Paso

Una vez configurado Google Chat, puedes:
- [Configurar Telegram](TELEGRAM_SETUP.md)
- [Configurar WhatsApp](WHATSAPP_SETUP.md)
- [Ver guía de despliegue completa](DEPLOYMENT.md)

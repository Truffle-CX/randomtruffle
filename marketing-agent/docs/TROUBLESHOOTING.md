# Troubleshooting Guide 🔧

Soluciones para problemas comunes del Marketing Health Check Agent.

## Tabla de Contenidos

1. [Problemas de Configuración](#configuración)
2. [Errores de MCP Servers](#mcp-servers)
3. [Problemas con Gemini API](#gemini-api)
4. [Errores de Integración](#integraciones)
5. [Problemas de Despliegue](#despliegue)

## Configuración

### Error: "GEMINI_API_KEY environment variable is required"

**Causa**: La API key de Gemini no está configurada.

**Solución**:
```bash
# Verificar .env
cat .env | grep GEMINI_API_KEY

# Si no existe, agregar:
echo "GEMINI_API_KEY=your_key_here" >> .env
```

### Error: "GA4_PROPERTY_ID environment variable is required"

**Causa**: El ID de la propiedad de GA4 no está configurado.

**Solución**:
```bash
# Encontrar tu Property ID en GA4
# GA4 > Admin > Property Settings > Property ID

# Agregar a .env:
echo "GA4_PROPERTY_ID=123456789" >> .env
```

## MCP Servers

### Error: "GA4 client not initialized"

**Causa**: El MCP Server de GA4 no pudo iniciarse.

**Diagnóstico**:
```bash
# Verificar que el server esté compilado
ls mcp-servers/ga4/dist/index.js

# Si no existe:
cd mcp-servers/ga4
npm install
npm run build
```

**Verificar credenciales**:
```bash
# El archivo debe existir y ser JSON válido
cat credentials/ga4-credentials.json | jq .
```

### Error: "Google Ads API authentication failed"

**Causa**: Credenciales de Google Ads incorrectas o expiradas.

**Solución**:

1. Verificar todas las credenciales:
```bash
env | grep GOOGLE_ADS
```

2. Regenerar refresh token:
```bash
# Usar la herramienta de Google Ads
npm run ads:auth
```

3. Verificar que el developer token esté activo en Google Ads API Center

### Error: "Protocol error (Target.createTarget): Target closed"

**Causa**: Error en el proceso hijo del MCP Server.

**Solución**:
```bash
# Aumentar timeout
export MCP_SERVER_TIMEOUT=60000

# Reiniciar
npm start
```

## Gemini API

### Error: "Rate limit exceeded"

**Causa**: Demasiadas requests a Gemini API.

**Solución**:

1. Implementar rate limiting:
```typescript
// Agregar delay entre requests
await new Promise(resolve => setTimeout(resolve, 1000));
```

2. Usar quotas:
```typescript
const REQUESTS_PER_MINUTE = 60;
// Implementar queue de requests
```

3. Contactar a Google para aumentar límites

### Error: "Invalid API key"

**Causa**: API key incorrecta o deshabilitada.

**Solución**:

1. Verificar API key:
```bash
curl -H "x-goog-api-key: YOUR_API_KEY" \
  https://generativelanguage.googleapis.com/v1beta/models
```

2. Generar nueva key en [AI Studio](https://makersuite.google.com/app/apikey)

### Error: "Model not found: gemini-2.0-flash-exp"

**Causa**: Modelo no disponible o nombre incorrecto.

**Solución**:
```env
# Usar modelo estable
GEMINI_MODEL=gemini-1.5-pro
```

## Integraciones

### Google Chat

#### Bot no responde

**Diagnóstico**:
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:8080/health

# Verificar logs
tail -f logs/agent.log | grep GoogleChat
```

**Soluciones comunes**:

1. Verificar URL de webhook:
   - Debe ser HTTPS
   - Debe ser accesible públicamente
   - Debe apuntar al endpoint correcto

2. Verificar permisos de la app

3. Revisar que el bot esté añadido al espacio

#### Error: "Webhook URL must be HTTPS"

**Solución**:
```bash
# Para desarrollo, usar ngrok
ngrok http 8080

# Para producción, usar certificado SSL
certbot --nginx -d your-domain.com
```

### Telegram

#### Error: "Conflict: terminated by other getUpdates request"

**Causa**: Otra instancia del bot está corriendo.

**Solución**:
```bash
# Detener todas las instancias
pkill -f telegram.js

# O usar PM2
pm2 delete all

# Reiniciar
npm run start:telegram
```

#### Bot responde muy lento

**Causa**: Procesamiento síncrono de mensajes.

**Solución**:
```typescript
// Responder inmediatamente y procesar async
await ctx.reply('Procesando...');
processHealthCheckAsync(ctx.from.id, clientName);
```

### WhatsApp

#### QR Code no aparece

**Solución**:
```bash
# Verificar que la terminal soporte QR
echo $TERM

# Alternativa: generar URL
# Modificar src/integrations/whatsapp.ts para usar URL
```

#### Error: "Protocol error (Target.createTarget)"

**Causa**: Problemas con Chromium en servidor sin GUI.

**Solución**:
```bash
# Instalar dependencias
sudo apt-get install -y \
  chromium-browser \
  xvfb

# Ejecutar con Xvfb
xvfb-run -a npm run start:whatsapp
```

#### Sesión se pierde constantemente

**Solución**:

1. Verificar permisos:
```bash
chmod -R 755 whatsapp-session/
```

2. Usar volumen persistente en Docker:
```bash
docker run -v $(pwd)/whatsapp-session:/app/whatsapp-session ...
```

3. Hacer backup regular:
```bash
# Cron job para backup diario
0 2 * * * tar -czf whatsapp-backup-$(date +\%Y\%m\%d).tar.gz whatsapp-session/
```

## Despliegue

### Error: "Cannot find module"

**Causa**: Dependencias no instaladas en producción.

**Solución**:
```dockerfile
# En Dockerfile, instalar todas las deps
RUN npm install --production=false
RUN npm run build
RUN npm prune --production
```

### Out of Memory Error

**Causa**: Límite de memoria insuficiente.

**Solución**:

Google Cloud Run:
```bash
gcloud run deploy marketing-agent \
  --memory 2Gi \
  --cpu 2
```

Docker:
```bash
docker run --memory=2g --cpus=2 marketing-agent
```

PM2:
```bash
pm2 start app.js --max-memory-restart 2G
```

### SSL Certificate Error

**Causa**: Certificados no válidos o expirados.

**Solución**:
```bash
# Renovar con certbot
certbot renew

# Verificar renovación automática
systemctl status certbot.timer
```

## Errores de Datos

### Error: "Property not found"

**Causa**: ID de propiedad GA4 incorrecto.

**Solución**:
```bash
# Verificar property ID
# En GA4 > Admin > Property Settings

# Listar propiedades disponibles
node -e "
const { AnalyticsAdminServiceClient } = require('@google-analytics/admin');
const client = new AnalyticsAdminServiceClient();
client.listAccountSummaries().then(console.log);
"
```

### Error: "Customer not found" (Google Ads)

**Causa**: Customer ID incorrecto.

**Solución**:
```bash
# Customer ID debe ser sin guiones
# Correcto: 1234567890
# Incorrecto: 123-456-7890

# Verificar en Google Ads UI (esquina superior derecha)
```

## Problemas de Performance

### Health Check muy lento

**Diagnóstico**:
```typescript
// Agregar timing
console.time('GA4 Analysis');
await analyzeGA4();
console.timeEnd('GA4 Analysis');
```

**Optimizaciones**:

1. Paralelizar requests:
```typescript
const [ga4Data, adsData, metaData] = await Promise.all([
  analyzeGA4(),
  analyzeGoogleAds(),
  analyzeMetaAds(),
]);
```

2. Cachear resultados:
```typescript
const cache = new Map();
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

3. Reducir cantidad de datos:
```typescript
// Limitar rango de fechas
daysAgo: 7 // en lugar de 30
```

### Alto uso de memoria

**Solución**:

1. Liberar recursos:
```typescript
// Cerrar clientes después de usar
await mcpClient.close();
```

2. Usar streams para datos grandes:
```typescript
// En lugar de cargar todo en memoria
const stream = await getData();
for await (const chunk of stream) {
  process(chunk);
}
```

## Logs y Debugging

### Habilitar debug logging

```env
LOG_LEVEL=debug
```

### Ver logs estructurados

```bash
# JSON pretty print
tail -f logs/agent.log | jq .
```

### Monitorear en tiempo real

```bash
# Google Cloud
gcloud run logs tail marketing-agent

# AWS
aws logs tail /ecs/marketing-agent --follow

# PM2
pm2 logs marketing-agent --lines 100
```

## Obtener Ayuda

Si ninguna solución funciona:

1. **Revisa los logs completos**:
```bash
cat logs/agent.log | grep ERROR
```

2. **Verifica las versiones**:
```bash
node --version
npm --version
npm list
```

3. **Crea un issue** en GitHub con:
   - Descripción del problema
   - Logs relevantes
   - Variables de entorno (sin credentials)
   - Pasos para reproducir

4. **Contacta soporte**:
   - Google Gemini: [Support](https://support.google.com/)
   - Google Ads API: [Forum](https://groups.google.com/g/adwords-api)
   - GA4 API: [Support](https://support.google.com/analytics/)

## Recursos Adicionales

- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Docker Troubleshooting](https://docs.docker.com/config/containers/logging/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

# Marketing Health Check Agent 🚀

Agente de marketing especializado construido con **Gemini ADK** que realiza auditorías completas (health checks) de Google Analytics 4, Google Ads y Meta Ads, proporcionando calificaciones de madurez y recomendaciones accionables.

## 📋 Características

- ✅ **Auditorías Completas**: Análisis profundo de GA4, Google Ads y Meta Ads
- 📊 **Sistema de Scoring**: Calificación de madurez de 1-5 niveles
- 🤖 **Gemini AI**: Utiliza Gemini 2.0 Flash para análisis inteligente
- 🔌 **MCP Servers**: Conexión directa con plataformas mediante Model Context Protocol
- 💬 **Multi-plataforma**: Integración con Google Chat, Telegram y WhatsApp
- 📈 **Recomendaciones Priorizadas**: Quick wins y mejoras a largo plazo
- 🔍 **Checklist Detallado**: Más de 100 puntos de verificación por plataforma

## 🏗️ Arquitectura

```
marketing-agent/
├── src/
│   ├── agent/              # Agente principal con Gemini
│   ├── config/             # System instructions y configuración
│   ├── integrations/       # Google Chat, Telegram, WhatsApp
│   ├── mcp/               # Cliente MCP para conectar con servers
│   └── utils/             # Utilidades (logger, etc.)
├── mcp-servers/
│   ├── ga4/               # MCP Server para Google Analytics 4
│   └── google-ads/        # MCP Server para Google Ads
└── docs/                  # Documentación adicional
```

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js >= 18.0.0
- npm o yarn
- Cuentas activas en GA4 y Google Ads
- API Key de Google Gemini

### Instalación

1. **Clonar el repositorio**:
```bash
cd marketing-agent
```

2. **Instalar dependencias**:
```bash
# Dependencias principales
npm install

# MCP Server GA4
cd mcp-servers/ga4
npm install
npm run build

# MCP Server Google Ads
cd ../google-ads
npm install
npm run build

# Volver a la raíz
cd ../..
```

3. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales (ver sección de Configuración).

4. **Compilar el proyecto**:
```bash
npm run build
```

5. **Ejecutar el agente**:
```bash
npm start
```

## ⚙️ Configuración

### 1. Obtener Gemini API Key

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una nueva API key
3. Copia la key y agrégala a `.env`:
```env
GEMINI_API_KEY=your_api_key_here
```

### 2. Configurar Google Analytics 4

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto (o usa uno existente)
3. Habilita la API de Google Analytics Data API v1
4. Crea una cuenta de servicio:
   - Ve a "IAM & Admin" > "Service Accounts"
   - Crea una nueva cuenta de servicio
   - Descarga el JSON de credenciales
5. En GA4, agrega el email de la cuenta de servicio con permisos de "Lector"
6. Guarda el JSON en `credentials/ga4-credentials.json`
7. Configura en `.env`:
```env
GA4_PROPERTY_ID=123456789
GA4_CREDENTIALS_PATH=./credentials/ga4-credentials.json
```

### 3. Configurar Google Ads

1. Ve a [Google Ads API Center](https://ads.google.com/aw/apicenter)
2. Solicita acceso a Google Ads API (si no lo tienes)
3. Obtén tu Developer Token
4. Crea credenciales OAuth 2.0:
   - Ve a Google Cloud Console
   - Habilita Google Ads API
   - Crea credenciales OAuth 2.0
5. Genera refresh token usando el script de autenticación
6. Configura en `.env`:
```env
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token
GOOGLE_ADS_CUSTOMER_ID=1234567890
```

### 4. Configurar Meta Ads (Opcional)

```env
META_ACCESS_TOKEN=your_access_token
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_AD_ACCOUNT_ID=act_123456789
```

## 🤖 Uso

### Como Script Standalone

```bash
# Ejecutar ejemplo de health check
npm start

# En modo desarrollo
npm run dev
```

### Con Google Chat

```bash
npm run start:google-chat
```

Ver [docs/GOOGLE_CHAT_SETUP.md](docs/GOOGLE_CHAT_SETUP.md) para configuración detallada.

### Con Telegram

```bash
npm run start:telegram
```

Ver [docs/TELEGRAM_SETUP.md](docs/TELEGRAM_SETUP.md) para configuración detallada.

### Con WhatsApp

```bash
npm run start:whatsapp
```

Ver [docs/WHATSAPP_SETUP.md](docs/WHATSAPP_SETUP.md) para configuración detallada.

## 📊 Sistema de Scoring

El agente evalúa cada plataforma con un sistema de scoring detallado:

### Niveles de Madurez

| Nivel | Puntos | Calificación | Descripción |
|-------|--------|--------------|-------------|
| 🔴 1  | 0-25   | Inicial      | Configuración básica, muchas oportunidades |
| 🟡 2  | 26-50  | En Desarrollo| Funcional pero necesita optimización |
| 🟠 3  | 51-75  | Establecido  | Buena configuración con mejoras menores |
| 🟢 4  | 76-90  | Avanzado     | Excelente configuración |
| 🟣 5  | 91-100 | Optimizado   | Best practices implementadas |

### Categorías de Evaluación

#### Google Analytics 4 (100 puntos)
- Configuración Básica (20 pts)
- Eventos y Conversiones (25 pts)
- Audiencias y Segmentación (15 pts)
- Reportes y Análisis (15 pts)
- Datos y Privacidad (15 pts)
- Integraciones Avanzadas (10 pts)

#### Google Ads (100 puntos)
- Estructura de Cuenta (20 pts)
- Tracking y Conversiones (25 pts)
- Estrategia de Puja (20 pts)
- Calidad de Anuncios (20 pts)
- Keywords y Segmentación (10 pts)
- Medición y Optimización (5 pts)

#### Meta Ads (100 puntos)
- Configuración de Cuenta (15 pts)
- Pixel y Tracking (25 pts)
- Audiencias (20 pts)
- Estructura de Campañas (20 pts)
- Creativos (15 pts)
- Optimización y Medición (5 pts)

## 🛠️ Desarrollo

### Estructura del Código

```typescript
// Inicializar el agente
import { MarketingHealthCheckAgent } from './agent/marketing-agent.js';

const agent = new MarketingHealthCheckAgent(
  process.env.GEMINI_API_KEY,
  'gemini-2.0-flash-exp'
);

await agent.initialize();

// Realizar health check
const result = await agent.performHealthCheck({
  platforms: ['ga4', 'google-ads'],
  clientName: 'Mi Cliente',
  userId: 'user123',
});

console.log(result.report);
```

### Ejecutar Tests

```bash
npm test
```

### Linting y Formateo

```bash
npm run lint
npm run format
```

## 📖 Documentación Adicional

- [Configuración de Google Chat](docs/GOOGLE_CHAT_SETUP.md)
- [Configuración de Telegram](docs/TELEGRAM_SETUP.md)
- [Configuración de WhatsApp](docs/WHATSAPP_SETUP.md)
- [Guía de Despliegue](docs/DEPLOYMENT.md)
- [Personalización del Checklist](docs/CUSTOMIZATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🔒 Seguridad

- **Nunca** commitees el archivo `.env` o credenciales
- Usa Secret Manager en producción (Google Cloud Secret Manager, AWS Secrets Manager, etc.)
- Rota las API keys regularmente
- Limita los permisos de las cuentas de servicio al mínimo necesario

## 🚀 Despliegue

### Google Cloud Run

```bash
# Build Docker image
docker build -t marketing-agent .

# Push to GCR
gcloud builds submit --tag gcr.io/[PROJECT-ID]/marketing-agent

# Deploy
gcloud run deploy marketing-agent \
  --image gcr.io/[PROJECT-ID]/marketing-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

Ver [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para más opciones.

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el repositorio
2. Crea una branch para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📧 Soporte

Para preguntas o soporte:
- Abre un issue en GitHub
- Consulta la documentación en `docs/`
- Revisa el [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🙏 Agradecimientos

- Google Gemini AI por el modelo de lenguaje
- Model Context Protocol (MCP) por la arquitectura de integración
- Google Analytics, Google Ads y Meta por sus APIs

---

Desarrollado con ❤️ usando Gemini ADK

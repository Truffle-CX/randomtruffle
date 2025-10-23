# Guía de Personalización 🎨

Esta guía te ayudará a personalizar el Marketing Health Check Agent según tus necesidades específicas.

## Tabla de Contenidos

1. [Personalizar Checklist](#personalizar-checklist)
2. [Ajustar Sistema de Scoring](#sistema-de-scoring)
3. [Modificar System Instructions](#system-instructions)
4. [Agregar Nuevas Plataformas](#nuevas-plataformas)
5. [Personalizar Reportes](#reportes)

## Personalizar Checklist

El checklist está definido en `src/config/system-instructions.ts`.

### Agregar Items al Checklist

```typescript
// src/config/system-instructions.ts

export const SYSTEM_INSTRUCTIONS = `
...
### 7. TU NUEVA CATEGORÍA (10 puntos)
#### 7.1 Subcategoría (5 puntos)
- [ ] Item personalizado 1 (3 puntos)
- [ ] Item personalizado 2 (2 puntos)

#### 7.2 Otra Subcategoría (5 puntos)
- [ ] Item personalizado 3 (3 puntos)
- [ ] Item personalizado 4 (2 puntos)
...
`;
```

### Modificar Puntuación

Ajusta los puntos de cada item según su importancia:

```typescript
// Antes:
- [ ] Enhanced measurement activado (1 punto)

// Después (más importante):
- [ ] Enhanced measurement activado (3 puntos)
```

**Importante**: Recalcula el total para que siga siendo 100 puntos.

### Ejemplo: Agregar Auditoría de BigQuery

```typescript
export const SYSTEM_INSTRUCTIONS = `
...
## CHECKLIST DE GOOGLE ANALYTICS 4 (GA4)

### 6. INTEGRACIONES AVANZADAS (10 puntos)
- [ ] BigQuery export configurado (3 puntos)
- [ ] Looker Studio dashboards creados (3 puntos)
- [ ] API de GA4 siendo utilizada (2 puntos)
- [ ] Integración con CRM (2 puntos)

### 7. BIGQUERY CONFIGURATION (15 puntos) // NUEVO
#### 7.1 Export Settings (8 puntos)
- [ ] Daily export habilitado (3 puntos)
- [ ] Streaming export configurado (3 puntos)
- [ ] Dataset organizado apropiadamente (2 puntos)

#### 7.2 Queries y Análisis (7 puntos)
- [ ] Scheduled queries configuradas (3 puntos)
- [ ] Views o tablas útiles creadas (2 puntos)
- [ ] Documentación de queries (2 puntos)
...
`;

// Actualizar puntuación máxima
export const SCORING_RULES = {
  ga4: {
    maxScore: 115, // Era 100, ahora 115
    sections: {
      basicConfig: { max: 20, weight: 0.17 },
      eventsConversions: { max: 25, weight: 0.22 },
      audiences: { max: 15, weight: 0.13 },
      reports: { max: 15, weight: 0.13 },
      dataPrivacy: { max: 15, weight: 0.13 },
      integrations: { max: 10, weight: 0.09 },
      bigquery: { max: 15, weight: 0.13 }, // NUEVO
    },
  },
  // ...
};
```

## Sistema de Scoring

### Ajustar Niveles de Madurez

```typescript
// src/config/system-instructions.ts

export const MATURITY_LEVELS = {
  1: { min: 0, max: 25, label: 'Inicial', emoji: '🔴' },
  2: { min: 26, max: 50, label: 'En Desarrollo', emoji: '🟡' },
  3: { min: 51, max: 75, label: 'Establecido', emoji: '🟠' },
  4: { min: 76, max: 90, label: 'Avanzado', emoji: '🟢' },
  5: { min: 91, max: 100, label: 'Optimizado', emoji: '🟣' },
};
```

**Personalizar**:

```typescript
export const MATURITY_LEVELS = {
  1: { min: 0, max: 20, label: 'Crítico', emoji: '💀' },
  2: { min: 21, max: 40, label: 'Básico', emoji: '🔴' },
  3: { min: 41, max: 60, label: 'Intermedio', emoji: '🟡' },
  4: { min: 61, max: 80, label: 'Avanzado', emoji: '🟢' },
  5: { min: 81, max: 100, label: 'Experto', emoji: '🏆' },
};
```

### Cambiar Pesos de Categorías

```typescript
export const SCORING_RULES = {
  ga4: {
    maxScore: 100,
    sections: {
      // Aumentar peso de tracking
      basicConfig: { max: 15, weight: 0.15 },       // era 0.20
      eventsConversions: { max: 35, weight: 0.35 }, // era 0.25
      audiences: { max: 15, weight: 0.15 },
      reports: { max: 10, weight: 0.10 },           // era 0.15
      dataPrivacy: { max: 15, weight: 0.15 },
      integrations: { max: 10, weight: 0.10 },
    },
  },
};
```

## System Instructions

### Modificar Tono del Agente

```typescript
// src/config/system-instructions.ts

// Agregar al final de SYSTEM_INSTRUCTIONS:
export const SYSTEM_INSTRUCTIONS = `
...

## TONO Y ESTILO

- **[TU ESTILO AQUÍ]**: Descripción de cómo quieres que se comunique
- **Ejemplo: Técnico y directo**: Usa términos específicos, mínima explicación
- **Ejemplo: Amigable y educativo**: Explica conceptos, usa ejemplos simples
...
`;
```

### Personalizar Formato de Reporte

```typescript
export const SYSTEM_INSTRUCTIONS = `
...

## FORMATO DE RESPUESTA

// Tu formato personalizado aquí
\`\`\`
# 📊 [TU TÍTULO]

## 🎯 [TU SECCIÓN 1]
[Tu contenido]

## 📈 [TU SECCIÓN 2]
[Tu contenido]
\`\`\`
...
`;
```

### Agregar Idioma Específico

```typescript
// Para reportes en inglés
export const SYSTEM_INSTRUCTIONS_EN = `
# Marketing Health Check Agent - Specialized Consultant

You are a digital marketing expert specialized in audits and health checks...
`;

// Usar según configuración
const instructions = process.env.LANGUAGE === 'en'
  ? SYSTEM_INSTRUCTIONS_EN
  : SYSTEM_INSTRUCTIONS;
```

## Nuevas Plataformas

### Agregar LinkedIn Ads

#### 1. Crear MCP Server

```bash
mkdir -p mcp-servers/linkedin
cd mcp-servers/linkedin
npm init -y
```

```typescript
// mcp-servers/linkedin/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// ... implementación similar a google-ads

export class LinkedInAdsMCPServer {
  // Implementar tools:
  // - get_campaigns
  // - get_conversion_tracking
  // - get_audience_lists
  // etc.
}
```

#### 2. Agregar Checklist

```typescript
// src/config/system-instructions.ts

export const SYSTEM_INSTRUCTIONS = `
...

## CHECKLIST DE LINKEDIN ADS

### 1. CONFIGURACIÓN DE CUENTA (20 puntos)
- [ ] Campaign Manager configurado (5 puntos)
- [ ] Insight Tag instalado (5 puntos)
- [ ] Conversiones configuradas (5 puntos)
- [ ] Matched Audiences configuradas (5 puntos)

### 2. TARGETING (25 puntos)
- [ ] Job Title targeting apropiado (8 puntos)
- [ ] Company targeting (8 puntos)
- [ ] Skills targeting (5 puntos)
- [ ] Seniority level (4 puntos)

### 3. CREATIVOS (25 puntos)
...
`;
```

#### 3. Implementar Análisis

```typescript
// src/agent/marketing-agent.ts

private async analyzeLinkedInAds(): Promise<PlatformScore> {
  const [
    campaigns,
    conversions,
    audiences,
  ] = await Promise.all([
    this.mcpClient.callLinkedInTool('get_campaigns', {}),
    this.mcpClient.callLinkedInTool('get_conversions', {}),
    this.mcpClient.callLinkedInTool('get_audiences', {}),
  ]);

  // Análisis y scoring...
  return platformScore;
}
```

#### 4. Actualizar Interface

```typescript
// src/agent/marketing-agent.ts

export interface HealthCheckRequest {
  platforms: ('ga4' | 'google-ads' | 'meta' | 'linkedin')[];
  clientName: string;
  userId: string;
}
```

### Agregar TikTok Ads

Similar al proceso de LinkedIn, pero usando TikTok API.

## Reportes

### Personalizar Formato

```typescript
// src/agent/marketing-agent.ts

private buildReportPrompt(request: HealthCheckRequest, platformResults: any): string {
  return `
Genera un reporte EN ESPAÑOL siguiendo este formato específico:

# 📊 AUDITORÍA MARKETING DIGITAL
**Cliente**: ${request.clientName}
**Fecha**: ${new Date().toLocaleDateString('es-ES')}

---

## 🎯 RESUMEN EJECUTIVO

**Score Global**: [X]/100
**Clasificación**: [Nivel]

### Highlights
- ✅ [Fortaleza principal]
- ⚠️ [Área de mejora crítica]

---

## 📈 ANÁLISIS POR PLATAFORMA

[Para cada plataforma...]

---

## 💡 RECOMENDACIONES

### 🔥 Urgente (1 semana)
1. ...

### 📅 Corto Plazo (1 mes)
1. ...

### 🚀 Largo Plazo (3+ meses)
1. ...

---

## 📋 PLAN DE ACCIÓN

### Sprint 1 (Semana 1-2)
- [ ] Acción 1
- [ ] Acción 2

### Sprint 2 (Semana 3-4)
- [ ] Acción 3
- [ ] Acción 4

---

*Generado el ${new Date().toISOString()}*
  `;
}
```

### Exportar a PDF

```typescript
// src/utils/pdf-exporter.ts
import PDFDocument from 'pdfkit';
import fs from 'fs';

export async function generatePDF(result: HealthCheckResult): Promise<Buffer> {
  const doc = new PDFDocument();
  const buffers: Buffer[] = [];

  doc.on('data', buffers.push.bind(buffers));

  // Título
  doc.fontSize(25).text('Health Check Report', 100, 100);

  // Cliente
  doc.fontSize(16).text(`Cliente: ${result.clientName}`, 100, 150);

  // Score
  doc.fontSize(14).text(`Score: ${result.totalScore}/100`, 100, 180);

  // ... más contenido

  doc.end();

  return Buffer.concat(buffers);
}
```

### Enviar por Email

```typescript
// src/utils/email-sender.ts
import nodemailer from 'nodemailer';

export async function sendReportByEmail(
  to: string,
  subject: string,
  report: string,
  attachments?: any[]
) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: report,
    attachments,
  });
}
```

## Configuración Avanzada

### Multi-tenant (Múltiples Clientes)

```typescript
// src/config/clients-config.ts
export interface ClientConfig {
  id: string;
  name: string;
  ga4PropertyId: string;
  googleAdsCustomerId: string;
  metaAdAccountId: string;
}

export const CLIENTS: Record<string, ClientConfig> = {
  'client-1': {
    id: 'client-1',
    name: 'Acme Corp',
    ga4PropertyId: '123456789',
    googleAdsCustomerId: '1234567890',
    metaAdAccountId: 'act_123456789',
  },
  'client-2': {
    // ...
  },
};
```

```typescript
// src/agent/marketing-agent.ts
async performHealthCheck(request: HealthCheckRequest): Promise<HealthCheckResult> {
  const clientConfig = CLIENTS[request.clientId];

  // Usar config específico del cliente
  this.mcpClient.setGA4PropertyId(clientConfig.ga4PropertyId);
  // ...
}
```

### Webhooks de Notificación

```typescript
// src/utils/webhooks.ts
export async function sendWebhook(url: string, data: any) {
  await axios.post(url, {
    event: 'health_check_completed',
    timestamp: new Date().toISOString(),
    data,
  });
}

// Usar en el agente
if (process.env.WEBHOOK_URL) {
  await sendWebhook(process.env.WEBHOOK_URL, result);
}
```

### Programar Auditorías

```typescript
// src/scheduler.ts
import cron from 'node-cron';

// Ejecutar todos los lunes a las 9 AM
cron.schedule('0 9 * * 1', async () => {
  for (const client of Object.values(CLIENTS)) {
    const result = await agent.performHealthCheck({
      platforms: ['ga4', 'google-ads', 'meta'],
      clientName: client.name,
      userId: 'scheduler',
    });

    await sendReportByEmail(
      client.email,
      `Weekly Health Check - ${client.name}`,
      result.report
    );
  }
});
```

## Testing

### Tests Unitarios Personalizados

```typescript
// tests/custom-checklist.test.ts
import { MarketingHealthCheckAgent } from '../src/agent/marketing-agent';

describe('Custom Checklist', () => {
  it('should include BigQuery export check', async () => {
    const agent = new MarketingHealthCheckAgent(API_KEY);
    const result = await agent.performHealthCheck({
      platforms: ['ga4'],
      clientName: 'Test Client',
      userId: 'test',
    });

    const bigQueryItems = result.platforms.ga4?.checklist.filter(
      item => item.category === 'BigQuery Configuration'
    );

    expect(bigQueryItems).toBeDefined();
    expect(bigQueryItems.length).toBeGreaterThan(0);
  });
});
```

## Recursos

- [Gemini API Documentation](https://ai.google.dev/docs)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

Para más ayuda, consulta:
- [README.md](../README.md)
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)

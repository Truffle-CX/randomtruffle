# Guía de Despliegue 🚀

Esta guía cubre diferentes opciones para desplegar el Marketing Health Check Agent en producción.

## Tabla de Contenidos

1. [Preparación](#preparación)
2. [Despliegue en Google Cloud Run](#google-cloud-run)
3. [Despliegue en AWS](#aws)
4. [Despliegue en Azure](#azure)
5. [Despliegue en VPS](#vps)
6. [Docker Compose](#docker-compose)
7. [Kubernetes](#kubernetes)
8. [Monitoreo y Mantenimiento](#monitoreo)

## Preparación

### 1. Checklist Pre-Despliegue

- [ ] Variables de entorno configuradas
- [ ] Credenciales de servicio generadas
- [ ] MCP Servers compilados
- [ ] Código compilado (`npm run build`)
- [ ] Tests pasando (`npm test`)
- [ ] Secret manager configurado
- [ ] Monitoreo configurado

### 2. Build del Proyecto

```bash
# Instalar dependencias
npm install

# Build MCP Servers
cd mcp-servers/ga4 && npm install && npm run build
cd ../google-ads && npm install && npm run build
cd ../..

# Build proyecto principal
npm run build
```

### 3. Variables de Entorno para Producción

Crea un archivo `.env.production`:

```env
# Gemini
GEMINI_API_KEY=<from-secret-manager>
GEMINI_MODEL=gemini-2.0-flash-exp

# GA4
GA4_PROPERTY_ID=<your-property-id>
GA4_CREDENTIALS_PATH=/app/credentials/ga4-credentials.json

# Google Ads
GOOGLE_ADS_CLIENT_ID=<from-secret-manager>
GOOGLE_ADS_CLIENT_SECRET=<from-secret-manager>
GOOGLE_ADS_DEVELOPER_TOKEN=<from-secret-manager>
GOOGLE_ADS_REFRESH_TOKEN=<from-secret-manager>
GOOGLE_ADS_CUSTOMER_ID=<your-customer-id>

# Meta
META_ACCESS_TOKEN=<from-secret-manager>
META_APP_ID=<your-app-id>
META_APP_SECRET=<from-secret-manager>

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## Google Cloud Run

### Ventajas
- Serverless (auto-scaling)
- Pago por uso
- Fácil despliegue
- Integración nativa con GCP

### Despliegue

#### 1. Crear Dockerfile

```dockerfile
# Dockerfile
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY mcp-servers/ga4/package*.json ./mcp-servers/ga4/
COPY mcp-servers/google-ads/package*.json ./mcp-servers/google-ads/

# Install dependencies
RUN npm install
RUN cd mcp-servers/ga4 && npm install
RUN cd mcp-servers/google-ads && npm install

# Copy source
COPY . .

# Build
RUN npm run build
RUN cd mcp-servers/ga4 && npm run build
RUN cd mcp-servers/google-ads && npm run build

# Expose port
EXPOSE 8080

# Start command (depends on integration)
CMD ["node", "dist/integrations/google-chat.js"]
```

#### 2. Build y Push

```bash
# Set project
gcloud config set project YOUR_PROJECT_ID

# Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/marketing-agent

# Or with Docker
docker build -t gcr.io/YOUR_PROJECT_ID/marketing-agent .
docker push gcr.io/YOUR_PROJECT_ID/marketing-agent
```

#### 3. Deploy

```bash
gcloud run deploy marketing-agent \
  --image gcr.io/YOUR_PROJECT_ID/marketing-agent \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,\
GOOGLE_ADS_CLIENT_SECRET=google-ads-secret:latest
```

#### 4. Configurar Secrets

```bash
# Crear secrets
echo -n "your-gemini-key" | gcloud secrets create gemini-api-key --data-file=-
echo -n "your-ads-secret" | gcloud secrets create google-ads-secret --data-file=-

# Dar acceso a Cloud Run
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member=serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

## AWS

### Despliegue en ECS (Elastic Container Service)

#### 1. Crear ECR Repository

```bash
aws ecr create-repository --repository-name marketing-agent
```

#### 2. Build y Push

```bash
# Login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t marketing-agent .

# Tag
docker tag marketing-agent:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/marketing-agent:latest

# Push
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/marketing-agent:latest
```

#### 3. Crear Task Definition

```json
{
  "family": "marketing-agent",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "marketing-agent",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/marketing-agent:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "GEMINI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:gemini-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/marketing-agent",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 4. Crear Service

```bash
aws ecs create-service \
  --cluster marketing-cluster \
  --service-name marketing-agent \
  --task-definition marketing-agent \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Secrets Manager

```bash
# Crear secrets
aws secretsmanager create-secret \
  --name gemini-api-key \
  --secret-string "your-api-key"

aws secretsmanager create-secret \
  --name google-ads-credentials \
  --secret-string file://google-ads-credentials.json
```

## Azure

### Despliegue en Azure Container Instances

#### 1. Create Container Registry

```bash
az acr create --resource-group marketing-agent-rg \
  --name marketingagentregistry \
  --sku Basic
```

#### 2. Build y Push

```bash
# Login
az acr login --name marketingagentregistry

# Build
docker build -t marketing-agent .

# Tag
docker tag marketing-agent marketingagentregistry.azurecr.io/marketing-agent:latest

# Push
docker push marketingagentregistry.azurecr.io/marketing-agent:latest
```

#### 3. Deploy

```bash
az container create \
  --resource-group marketing-agent-rg \
  --name marketing-agent \
  --image marketingagentregistry.azurecr.io/marketing-agent:latest \
  --cpu 2 \
  --memory 2 \
  --registry-login-server marketingagentregistry.azurecr.io \
  --registry-username <username> \
  --registry-password <password> \
  --environment-variables NODE_ENV=production \
  --secure-environment-variables GEMINI_API_KEY=<key> \
  --ports 8080
```

## VPS (DigitalOcean, Linode, etc.)

### Setup Inicial

```bash
# Conectar al servidor
ssh root@your-server-ip

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar nginx
apt install -y nginx

# Configurar firewall
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw enable
```

### Desplegar Aplicación

```bash
# Crear usuario para la app
adduser --disabled-password marketing-agent

# Clonar repositorio
su - marketing-agent
git clone https://github.com/your-repo/marketing-agent.git
cd marketing-agent

# Instalar y build
npm install
npm run build
cd mcp-servers/ga4 && npm install && npm run build && cd ../..
cd mcp-servers/google-ads && npm install && npm run build && cd ../..

# Configurar .env
cp .env.example .env
nano .env

# Iniciar con PM2
pm2 start dist/integrations/telegram.js --name marketing-agent-telegram
pm2 start dist/integrations/google-chat.js --name marketing-agent-google-chat
pm2 save
pm2 startup
```

### Configurar Nginx

```nginx
# /etc/nginx/sites-available/marketing-agent
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Habilitar sitio
ln -s /etc/nginx/sites-available/marketing-agent /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# SSL con Let's Encrypt
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## Docker Compose

Para ejecutar todo el stack localmente o en servidor:

```yaml
# docker-compose.yml
version: '3.8'

services:
  google-chat:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: marketing-agent-google-chat
    command: node dist/integrations/google-chat.js
    ports:
      - "8080:8080"
    env_file:
      - .env.production
    volumes:
      - ./credentials:/app/credentials:ro
      - ./logs:/app/logs
    restart: unless-stopped

  telegram:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: marketing-agent-telegram
    command: node dist/integrations/telegram.js
    env_file:
      - .env.production
    volumes:
      - ./credentials:/app/credentials:ro
      - ./logs:/app/logs
    restart: unless-stopped

  whatsapp:
    build:
      context: .
      dockerfile: Dockerfile.whatsapp
    container_name: marketing-agent-whatsapp
    command: node dist/integrations/whatsapp.js
    env_file:
      - .env.production
    volumes:
      - ./credentials:/app/credentials:ro
      - ./whatsapp-session:/app/whatsapp-session
      - ./logs:/app/logs
    restart: unless-stopped
```

Ejecutar:
```bash
docker-compose up -d
docker-compose logs -f
```

## Kubernetes

### Deployment YAML

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: marketing-agent
spec:
  replicas: 2
  selector:
    matchLabels:
      app: marketing-agent
  template:
    metadata:
      labels:
        app: marketing-agent
    spec:
      containers:
      - name: marketing-agent
        image: gcr.io/YOUR_PROJECT/marketing-agent:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: marketing-agent-secrets
              key: gemini-api-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        volumeMounts:
        - name: credentials
          mountPath: /app/credentials
          readOnly: true
      volumes:
      - name: credentials
        secret:
          secretName: gcp-credentials
---
apiVersion: v1
kind: Service
metadata:
  name: marketing-agent-service
spec:
  selector:
    app: marketing-agent
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s/deployment.yaml
kubectl get pods
kubectl logs -f <pod-name>
```

## Monitoreo

### Google Cloud Monitoring

```bash
# Instalar agent
curl -sSO https://dl.google.com/cloudagents/add-monitoring-agent-repo.sh
sudo bash add-monitoring-agent-repo.sh --also-install
```

### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  prometheus-data:
  grafana-data:
```

### Configurar Alertas

```javascript
// src/utils/alerts.ts
import axios from 'axios';

export async function sendSlackAlert(message: string) {
  await axios.post(process.env.SLACK_WEBHOOK_URL!, {
    text: message,
  });
}

export async function sendEmailAlert(subject: string, body: string) {
  // Implementar con SendGrid, AWS SES, etc.
}
```

## Mejores Prácticas

1. **Secrets Management**
   - Usa secret managers nativos de la plataforma
   - Nunca hardcodees credenciales
   - Rota secrets regularmente

2. **Logging**
   - Usa structured logging (JSON)
   - Centraliza logs (CloudWatch, Stackdriver, etc.)
   - Configura retención apropiada

3. **Monitoreo**
   - Configura health checks
   - Monitorea métricas clave (CPU, memoria, latencia)
   - Alertas para errores críticos

4. **Backup**
   - Backup de sesiones (WhatsApp)
   - Backup de configuraciones
   - Plan de disaster recovery

5. **Seguridad**
   - Actualiza dependencias regularmente
   - Usa HTTPS siempre
   - Implementa rate limiting
   - Valida inputs

## Troubleshooting

Ver [TROUBLESHOOTING.md](TROUBLESHOOTING.md) para problemas comunes y soluciones.

## Recursos Adicionales

- [Google Cloud Run Docs](https://cloud.google.com/run/docs)
- [AWS ECS Docs](https://docs.aws.amazon.com/ecs/)
- [Azure Container Instances](https://docs.microsoft.com/en-us/azure/container-instances/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

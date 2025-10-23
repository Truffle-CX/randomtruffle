#!/usr/bin/env node

import express from 'express';
import { MarketingHealthCheckAgent } from '../agent/marketing-agent.js';
import { Logger } from '../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('GoogleChat');
const app = express();
app.use(express.json());

// Store conversation histories per user
const conversationHistories = new Map<string, any[]>();

// Initialize the agent
const agent = new MarketingHealthCheckAgent(
  process.env.GEMINI_API_KEY!,
  process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
);

// Initialize agent on startup
agent.initialize().catch((error) => {
  logger.error('Failed to initialize agent:', error);
  process.exit(1);
});

interface GoogleChatMessage {
  type: string;
  message: {
    name: string;
    sender: {
      name: string;
      displayName: string;
      email: string;
    };
    text: string;
    thread: {
      name: string;
    };
    space: {
      name: string;
      type: string;
    };
  };
}

app.post('/', async (req, res) => {
  try {
    const event: GoogleChatMessage = req.body;

    logger.info('Received Google Chat event', {
      type: event.type,
      sender: event.message?.sender?.displayName,
    });

    // Handle ADDED_TO_SPACE event
    if (event.type === 'ADDED_TO_SPACE') {
      return res.json({
        text: `¡Hola! 👋 Soy tu consultor de marketing digital especializado.\n\n` +
          `Puedo ayudarte a realizar health checks completos de:\n` +
          `• Google Analytics 4 (GA4)\n` +
          `• Google Ads\n` +
          `• Meta Ads (Facebook/Instagram)\n\n` +
          `Para comenzar un health check, escribe:\n` +
          `**/healthcheck [nombre del cliente]**\n\n` +
          `O simplemente pregúntame sobre marketing digital y configuraciones de plataformas.`,
      });
    }

    // Handle MESSAGE event
    if (event.type === 'MESSAGE') {
      const userMessage = event.message.text.trim();
      const userId = event.message.sender.name;
      const userName = event.message.sender.displayName;

      // Get or create conversation history
      let history = conversationHistories.get(userId) || [];

      // Check if it's a health check command
      if (userMessage.toLowerCase().startsWith('/healthcheck')) {
        const clientName = userMessage.substring('/healthcheck'.length).trim() || 'Cliente';

        // Send immediate response
        res.json({
          text: `🔍 Iniciando health check para **${clientName}**...\n\n` +
            `Esto puede tomar unos minutos mientras analizo las plataformas.\n` +
            `Te notificaré cuando esté listo.`,
        });

        // Perform health check asynchronously
        performHealthCheckAsync(userId, clientName, event.message.space.name);
        return;
      }

      // Regular chat message
      const response = await agent.chat(userMessage, history);

      // Update conversation history
      history.push(
        { role: 'user', parts: [{ text: userMessage }] },
        { role: 'model', parts: [{ text: response }] }
      );

      // Keep only last 10 messages to avoid token limits
      if (history.length > 20) {
        history = history.slice(-20);
      }
      conversationHistories.set(userId, history);

      return res.json({
        text: response,
      });
    }

    // Handle REMOVED_FROM_SPACE event
    if (event.type === 'REMOVED_FROM_SPACE') {
      logger.info('Bot removed from space');
      return res.json({});
    }

    res.json({});
  } catch (error) {
    logger.error('Error handling Google Chat event:', error);
    res.json({
      text: '❌ Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.',
    });
  }
});

async function performHealthCheckAsync(userId: string, clientName: string, spaceName: string) {
  try {
    const result = await agent.performHealthCheck({
      platforms: ['ga4', 'google-ads'],
      clientName,
      userId,
    });

    // Send result back to Google Chat space
    // Note: In production, you would use the Google Chat API to send a message
    // For now, we'll log the result
    logger.info('Health check completed', {
      clientName,
      score: result.totalScore,
      maturityLevel: result.maturityLevel.label,
    });

    // Format the report for Google Chat
    const formattedReport = formatReportForChat(result);

    // Here you would send the formatted report back to the Google Chat space
    // using the Google Chat API with proper credentials
    logger.info('Report ready to send to Google Chat');
  } catch (error) {
    logger.error('Error performing async health check:', error);
  }
}

function formatReportForChat(result: any): string {
  let report = `# 📊 Health Check Completado - ${result.clientName}\n\n`;
  report += `**Puntuación Total**: ${result.totalScore}/100 ${result.maturityLevel.emoji}\n`;
  report += `**Nivel de Madurez**: ${result.maturityLevel.label}\n\n`;

  report += `## Resumen por Plataforma:\n\n`;

  if (result.platforms.ga4) {
    const ga4 = result.platforms.ga4;
    report += `### ${ga4.maturityLevel.emoji} Google Analytics 4\n`;
    report += `Puntuación: ${ga4.score}/${ga4.maxScore} (${ga4.percentage}%)\n\n`;
  }

  if (result.platforms['google-ads']) {
    const gads = result.platforms['google-ads'];
    report += `### ${gads.maturityLevel.emoji} Google Ads\n`;
    report += `Puntuación: ${gads.score}/${gads.maxScore} (${gads.percentage}%)\n\n`;
  }

  report += `\n---\n\n`;
  report += `## 🎯 Top Recomendaciones:\n\n`;

  result.recommendations.slice(0, 5).forEach((rec: string, index: number) => {
    report += `${index + 1}. ${rec}\n`;
  });

  return report;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'marketing-agent-google-chat' });
});

const PORT = process.env.GOOGLE_CHAT_PORT || 8080;

app.listen(PORT, () => {
  logger.info(`Google Chat integration started on port ${PORT}`);
  logger.info(`Webhook URL: http://your-domain:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await agent.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await agent.close();
  process.exit(0);
});

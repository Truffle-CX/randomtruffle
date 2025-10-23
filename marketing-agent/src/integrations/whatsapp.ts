#!/usr/bin/env node

import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { MarketingHealthCheckAgent } from '../agent/marketing-agent.js';
import { Logger } from '../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('WhatsApp');

// Store conversation histories per user
const conversationHistories = new Map<string, any[]>();

// Store user states for multi-step commands
const userStates = new Map<string, any>();

// Initialize the agent
const agent = new MarketingHealthCheckAgent(
  process.env.GEMINI_API_KEY!,
  process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
);

// Initialize WhatsApp client
const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    dataPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-session',
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// Initialize agent
agent.initialize().catch((error) => {
  logger.error('Failed to initialize agent:', error);
  process.exit(1);
});

// QR Code for authentication
whatsappClient.on('qr', (qr) => {
  logger.info('QR Code received, scan with WhatsApp mobile app:');
  qrcode.generate(qr, { small: true });
  console.log('\n');
});

// Client ready
whatsappClient.on('ready', () => {
  logger.info('WhatsApp client is ready!');
});

// Authentication success
whatsappClient.on('authenticated', () => {
  logger.info('WhatsApp client authenticated successfully');
});

// Authentication failure
whatsappClient.on('auth_failure', (msg) => {
  logger.error('WhatsApp authentication failed:', msg);
});

// Handle incoming messages
whatsappClient.on('message', async (message: Message) => {
  try {
    const userId = message.from;
    const userMessage = message.body.trim();
    const contact = await message.getContact();
    const userName = contact.pushname || contact.name || 'Usuario';

    logger.info('Received WhatsApp message', {
      userId,
      userName,
      message: userMessage.substring(0, 50),
    });

    // Ignore group messages
    const chat = await message.getChat();
    if (chat.isGroup) {
      return;
    }

    // Handle commands
    if (userMessage.toLowerCase().startsWith('/')) {
      await handleCommand(message, userId, userName);
      return;
    }

    // Check if user is in a waiting state
    const userState = userStates.get(userId);
    if (userState?.state === 'waiting_client_name') {
      const clientName = userMessage;
      const command = userState.command;

      await message.reply(
        `✨ Perfecto! Comenzando análisis para *${clientName}*...\n\n` +
          `Esto puede tomar unos minutos. Te notificaré cuando esté listo.`
      );

      // Clear state
      userStates.delete(userId);

      // Determine platforms
      let platforms: ('ga4' | 'google-ads' | 'meta')[] = [];
      switch (command) {
        case 'healthcheck':
          platforms = ['ga4', 'google-ads', 'meta'];
          break;
        case 'ga4':
          platforms = ['ga4'];
          break;
        case 'googleads':
          platforms = ['google-ads'];
          break;
        case 'meta':
          platforms = ['meta'];
          break;
      }

      // Perform health check
      try {
        const result = await agent.performHealthCheck({
          platforms,
          clientName,
          userId,
        });

        // Format and send report
        const report = formatReportForWhatsApp(result);
        await message.reply(report);

        // Send recommendations
        if (result.recommendations.length > 0) {
          let recMessage = '🎯 *Top 10 Recomendaciones:*\n\n';
          result.recommendations.slice(0, 10).forEach((rec: string, index: number) => {
            recMessage += `${index + 1}. ${rec}\n\n`;
          });
          await message.reply(recMessage);
        }

        await message.reply(
          'Para más información o análisis adicionales, escribe /help'
        );
      } catch (error) {
        logger.error('Error performing health check:', error);
        await message.reply(
          '❌ Ocurrió un error al realizar el health check. Por favor verifica las configuraciones y intenta de nuevo.'
        );
      }

      return;
    }

    // Regular chat
    let history = conversationHistories.get(userId) || [];
    const response = await agent.chat(userMessage, history);

    // Update conversation history
    history.push(
      { role: 'user', parts: [{ text: userMessage }] },
      { role: 'model', parts: [{ text: response }] }
    );

    // Keep only last 20 messages
    if (history.length > 20) {
      history = history.slice(-20);
    }
    conversationHistories.set(userId, history);

    // Send response
    await message.reply(response);
  } catch (error) {
    logger.error('Error handling WhatsApp message:', error);
    await message.reply(
      '❌ Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.'
    );
  }
});

async function handleCommand(message: Message, userId: string, userName: string) {
  const command = message.body.toLowerCase().split(' ')[0].substring(1);

  switch (command) {
    case 'start':
    case 'help':
      await message.reply(
        `👋 ¡Hola ${userName}! Soy tu consultor de marketing digital especializado.\n\n` +
          `Puedo ayudarte a realizar health checks completos de:\n` +
          `• Google Analytics 4 (GA4)\n` +
          `• Google Ads\n` +
          `• Meta Ads (Facebook/Instagram)\n\n` +
          `*Comandos disponibles:*\n\n` +
          `/healthcheck - Auditoría completa\n` +
          `/ga4 - Analizar solo GA4\n` +
          `/googleads - Analizar solo Google Ads\n` +
          `/meta - Analizar solo Meta Ads\n` +
          `/help - Ver esta ayuda\n\n` +
          `También puedes hacerme preguntas sobre marketing digital directamente.`
      );
      break;

    case 'healthcheck':
      userStates.set(userId, { state: 'waiting_client_name', command: 'healthcheck' });
      await message.reply(
        '🔍 *Iniciando Health Check Completo*\n\n' +
          'Por favor, envíame el nombre del cliente a analizar.'
      );
      break;

    case 'ga4':
      userStates.set(userId, { state: 'waiting_client_name', command: 'ga4' });
      await message.reply(
        '📊 *Análisis de Google Analytics 4*\n\n' +
          'Por favor, envíame el nombre del cliente.'
      );
      break;

    case 'googleads':
      userStates.set(userId, { state: 'waiting_client_name', command: 'googleads' });
      await message.reply(
        '🎯 *Análisis de Google Ads*\n\n' + 'Por favor, envíame el nombre del cliente.'
      );
      break;

    case 'meta':
      userStates.set(userId, { state: 'waiting_client_name', command: 'meta' });
      await message.reply(
        '📱 *Análisis de Meta Ads*\n\n' + 'Por favor, envíame el nombre del cliente.'
      );
      break;

    default:
      await message.reply(
        '❓ Comando no reconocido. Escribe /help para ver los comandos disponibles.'
      );
  }
}

function formatReportForWhatsApp(result: any): string {
  let report = `📊 *HEALTH CHECK REPORT*\n`;
  report += `Cliente: *${result.clientName}*\n`;
  report += `Fecha: ${new Date(result.timestamp).toLocaleDateString('es-ES')}\n\n`;

  report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  report += `*PUNTUACIÓN TOTAL*\n`;
  report += `${result.totalScore}/100 ${result.maturityLevel.emoji}\n`;
  report += `Nivel: *${result.maturityLevel.label}*\n\n`;

  report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  report += `*DESGLOSE POR PLATAFORMA*\n\n`;

  if (result.platforms.ga4) {
    const ga4 = result.platforms.ga4;
    report += `${ga4.maturityLevel.emoji} *Google Analytics 4*\n`;
    report += `Puntuación: ${ga4.score}/${ga4.maxScore} (${ga4.percentage}%)\n`;
    report += `Nivel: ${ga4.maturityLevel.label}\n\n`;

    // Add top issues
    const missing = ga4.checklist.filter((item: any) => item.status === 'missing').slice(0, 3);
    if (missing.length > 0) {
      report += `⚠️ Principales pendientes:\n`;
      missing.forEach((item: any) => {
        report += `  • ${item.item}\n`;
      });
      report += `\n`;
    }
  }

  if (result.platforms['google-ads']) {
    const gads = result.platforms['google-ads'];
    report += `${gads.maturityLevel.emoji} *Google Ads*\n`;
    report += `Puntuación: ${gads.score}/${gads.maxScore} (${gads.percentage}%)\n`;
    report += `Nivel: ${gads.maturityLevel.label}\n\n`;

    const missing = gads.checklist.filter((item: any) => item.status === 'missing').slice(0, 3);
    if (missing.length > 0) {
      report += `⚠️ Principales pendientes:\n`;
      missing.forEach((item: any) => {
        report += `  • ${item.item}\n`;
      });
      report += `\n`;
    }
  }

  if (result.platforms.meta) {
    const meta = result.platforms.meta;
    report += `${meta.maturityLevel.emoji} *Meta Ads*\n`;
    report += `Puntuación: ${meta.score}/${meta.maxScore} (${meta.percentage}%)\n`;
    report += `Nivel: ${meta.maturityLevel.label}\n\n`;
  }

  report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  return report;
}

// Error handling
whatsappClient.on('disconnected', (reason) => {
  logger.warn('WhatsApp client disconnected:', reason);
});

// Initialize WhatsApp client
logger.info('Starting WhatsApp client...');
whatsappClient.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await whatsappClient.destroy();
  await agent.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await whatsappClient.destroy();
  await agent.close();
  process.exit(0);
});

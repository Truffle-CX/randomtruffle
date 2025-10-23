#!/usr/bin/env node

import { Telegraf, Context } from 'telegraf';
import { MarketingHealthCheckAgent } from '../agent/marketing-agent.js';
import { Logger } from '../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('Telegram');

// Store conversation histories per user
const conversationHistories = new Map<string, any[]>();

// Initialize the agent
const agent = new MarketingHealthCheckAgent(
  process.env.GEMINI_API_KEY!,
  process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
);

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Initialize agent
agent.initialize().catch((error) => {
  logger.error('Failed to initialize agent:', error);
  process.exit(1);
});

// Start command
bot.command('start', async (ctx: Context) => {
  const welcomeMessage = `
👋 ¡Hola! Soy tu consultor de marketing digital especializado.

Puedo ayudarte a realizar health checks completos de:
• Google Analytics 4 (GA4)
• Google Ads
• Meta Ads (Facebook/Instagram)

*Comandos disponibles:*

/healthcheck - Iniciar un health check completo
/ga4 - Analizar solo GA4
/googleads - Analizar solo Google Ads
/meta - Analizar solo Meta Ads
/help - Ver ayuda

También puedes hacerme preguntas sobre marketing digital y configuraciones de plataformas.
`;

  await ctx.reply(welcomeMessage);
});

// Help command
bot.command('help', async (ctx: Context) => {
  const helpMessage = `
📚 *Guía de uso*

*Comandos principales:*
/healthcheck - Realizar auditoría completa de todas las plataformas
/ga4 - Auditar solo Google Analytics 4
/googleads - Auditar solo Google Ads
/meta - Auditar solo Meta Ads

*Cómo usar:*
1. Usa /healthcheck para comenzar una auditoría
2. Te pediré el nombre del cliente
3. Analizaré las plataformas conectadas
4. Recibirás un reporte detallado con puntuación y recomendaciones

*Conversación:*
También puedes escribirme directamente con preguntas sobre:
- Configuraciones de GA4
- Optimización de campañas de Google Ads
- Best practices de Meta Ads
- Interpretación de métricas
- Estrategias de marketing digital

¡Estoy aquí para ayudarte! 🚀
`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Health check command
bot.command('healthcheck', async (ctx: Context) => {
  const userId = ctx.from?.id.toString() || 'unknown';

  await ctx.reply(
    '🔍 *Iniciando Health Check Completo*\n\n' +
      'Por favor, envíame el nombre del cliente a analizar.',
    { parse_mode: 'Markdown' }
  );

  // Set user in waiting state
  conversationHistories.set(userId, [
    { role: 'system', state: 'waiting_client_name', command: 'healthcheck' },
  ]);
});

// GA4 only command
bot.command('ga4', async (ctx: Context) => {
  const userId = ctx.from?.id.toString() || 'unknown';

  await ctx.reply(
    '📊 *Análisis de Google Analytics 4*\n\n' +
      'Por favor, envíame el nombre del cliente.',
    { parse_mode: 'Markdown' }
  );

  conversationHistories.set(userId, [
    { role: 'system', state: 'waiting_client_name', command: 'ga4' },
  ]);
});

// Google Ads only command
bot.command('googleads', async (ctx: Context) => {
  const userId = ctx.from?.id.toString() || 'unknown';

  await ctx.reply(
    '🎯 *Análisis de Google Ads*\n\n' + 'Por favor, envíame el nombre del cliente.',
    { parse_mode: 'Markdown' }
  );

  conversationHistories.set(userId, [
    { role: 'system', state: 'waiting_client_name', command: 'googleads' },
  ]);
});

// Meta only command
bot.command('meta', async (ctx: Context) => {
  const userId = ctx.from?.id.toString() || 'unknown';

  await ctx.reply(
    '📱 *Análisis de Meta Ads*\n\n' + 'Por favor, envíame el nombre del cliente.',
    { parse_mode: 'Markdown' }
  );

  conversationHistories.set(userId, [
    { role: 'system', state: 'waiting_client_name', command: 'meta' },
  ]);
});

// Handle text messages
bot.on('text', async (ctx: Context) => {
  try {
    const userId = ctx.from?.id.toString() || 'unknown';
    const userMessage = ctx.message?.text || '';
    const userName = ctx.from?.first_name || 'Usuario';

    logger.info('Received message from user', { userId, userName, message: userMessage });

    // Check if user is in waiting state
    let history = conversationHistories.get(userId) || [];
    const systemState = history.find((h) => h.role === 'system');

    if (systemState?.state === 'waiting_client_name') {
      const clientName = userMessage.trim();
      const command = systemState.command;

      await ctx.reply(
        `✨ Perfecto! Comenzando análisis para *${clientName}*...\n\n` +
          `Esto puede tomar unos minutos. Te notificaré cuando esté listo.`,
        { parse_mode: 'Markdown' }
      );

      // Determine platforms based on command
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

      // Clear waiting state
      conversationHistories.delete(userId);

      // Perform health check
      try {
        const result = await agent.performHealthCheck({
          platforms,
          clientName,
          userId,
        });

        // Format and send report
        const report = formatReportForTelegram(result);

        // Split report if too long (Telegram has a 4096 character limit)
        if (report.length > 4000) {
          const chunks = splitMessage(report, 4000);
          for (const chunk of chunks) {
            await ctx.reply(chunk, { parse_mode: 'Markdown' });
          }
        } else {
          await ctx.reply(report, { parse_mode: 'Markdown' });
        }

        // Send recommendations separately
        if (result.recommendations.length > 0) {
          let recMessage = '🎯 *Top 10 Recomendaciones:*\n\n';
          result.recommendations.slice(0, 10).forEach((rec: string, index: number) => {
            recMessage += `${index + 1}. ${rec}\n\n`;
          });
          await ctx.reply(recMessage, { parse_mode: 'Markdown' });
        }
      } catch (error) {
        logger.error('Error performing health check:', error);
        await ctx.reply(
          '❌ Ocurrió un error al realizar el health check. Por favor verifica las configuraciones y intenta de nuevo.'
        );
      }

      return;
    }

    // Regular chat
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

    // Split response if too long
    if (response.length > 4000) {
      const chunks = splitMessage(response, 4000);
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: 'Markdown' });
      }
    } else {
      await ctx.reply(response, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    await ctx.reply(
      '❌ Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.'
    );
  }
});

function formatReportForTelegram(result: any): string {
  let report = `📊 *HEALTH CHECK REPORT*\n`;
  report += `Cliente: *${result.clientName}*\n\n`;
  report += `*Puntuación Total*: ${result.totalScore}/100 ${result.maturityLevel.emoji}\n`;
  report += `*Nivel de Madurez*: ${result.maturityLevel.label}\n\n`;

  report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (result.platforms.ga4) {
    const ga4 = result.platforms.ga4;
    report += `${ga4.maturityLevel.emoji} *Google Analytics 4*\n`;
    report += `Puntuación: ${ga4.score}/${ga4.maxScore} (${ga4.percentage}%)\n`;
    report += `Nivel: ${ga4.maturityLevel.label}\n\n`;
  }

  if (result.platforms['google-ads']) {
    const gads = result.platforms['google-ads'];
    report += `${gads.maturityLevel.emoji} *Google Ads*\n`;
    report += `Puntuación: ${gads.score}/${gads.maxScore} (${gads.percentage}%)\n`;
    report += `Nivel: ${gads.maturityLevel.label}\n\n`;
  }

  if (result.platforms.meta) {
    const meta = result.platforms.meta;
    report += `${meta.maturityLevel.emoji} *Meta Ads*\n`;
    report += `Puntuación: ${meta.score}/${meta.maxScore} (${meta.percentage}%)\n`;
    report += `Nivel: ${meta.maturityLevel.label}\n\n`;
  }

  return report;
}

function splitMessage(message: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';

  const lines = message.split('\n');

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Error handling
bot.catch((error: any) => {
  logger.error('Telegram bot error:', error);
});

// Start bot
bot.launch().then(() => {
  logger.info('Telegram bot started successfully');
  logger.info(`Bot username: @${bot.botInfo?.username}`);
});

// Graceful shutdown
process.once('SIGINT', async () => {
  logger.info('Shutting down...');
  bot.stop('SIGINT');
  await agent.close();
  process.exit(0);
});

process.once('SIGTERM', async () => {
  logger.info('Shutting down...');
  bot.stop('SIGTERM');
  await agent.close();
  process.exit(0);
});

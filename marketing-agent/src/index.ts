#!/usr/bin/env node

import { MarketingHealthCheckAgent } from './agent/marketing-agent.js';
import { Logger } from './utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('Main');

async function main() {
  try {
    logger.info('Starting Marketing Health Check Agent...');

    // Validate required environment variables
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    // Initialize the agent
    const agent = new MarketingHealthCheckAgent(
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    );

    await agent.initialize();
    logger.info('Agent initialized successfully');

    // Example usage - perform a health check
    logger.info('Performing example health check...');

    const result = await agent.performHealthCheck({
      platforms: ['ga4', 'google-ads'],
      clientName: 'Example Client',
      userId: 'test-user',
    });

    logger.info('Health check completed', {
      score: result.totalScore,
      maturityLevel: result.maturityLevel.label,
    });

    console.log('\n=== HEALTH CHECK RESULT ===\n');
    console.log(`Client: ${result.clientName}`);
    console.log(`Total Score: ${result.totalScore}/100 ${result.maturityLevel.emoji}`);
    console.log(`Maturity Level: ${result.maturityLevel.label}`);
    console.log('\n=== PLATFORMS ===\n');

    if (result.platforms.ga4) {
      console.log(`\nGA4: ${result.platforms.ga4.score}/${result.platforms.ga4.maxScore}`);
      console.log(`Level: ${result.platforms.ga4.maturityLevel.label}`);
    }

    if (result.platforms['google-ads']) {
      console.log(
        `\nGoogle Ads: ${result.platforms['google-ads'].score}/${result.platforms['google-ads'].maxScore}`
      );
      console.log(`Level: ${result.platforms['google-ads'].maturityLevel.label}`);
    }

    console.log('\n=== TOP RECOMMENDATIONS ===\n');
    result.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    console.log('\n=== FULL REPORT ===\n');
    console.log(result.report);

    // Close the agent
    await agent.close();
    logger.info('Agent closed successfully');
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { MarketingHealthCheckAgent } from './agent/marketing-agent.js';
export { MCPClient } from './mcp/mcp-client.js';
export { Logger } from './utils/logger.js';

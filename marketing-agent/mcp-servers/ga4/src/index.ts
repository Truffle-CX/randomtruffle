#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { AnalyticsAdminServiceClient } from '@google-analytics/admin';
import { GoogleAuth } from 'google-auth-library';
import * as dotenv from 'dotenv';

dotenv.config();

interface GA4Config {
  propertyId: string;
  credentialsPath: string;
}

class GA4MCPServer {
  private server: Server;
  private analyticsDataClient: BetaAnalyticsDataClient | null = null;
  private analyticsAdminClient: AnalyticsAdminServiceClient | null = null;
  private config: GA4Config;

  constructor(config: GA4Config) {
    this.config = config;
    this.server = new Server(
      {
        name: 'ga4-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private async initializeClients() {
    try {
      const auth = new GoogleAuth({
        keyFile: this.config.credentialsPath,
        scopes: [
          'https://www.googleapis.com/auth/analytics.readonly',
          'https://www.googleapis.com/auth/analytics.edit',
        ],
      });

      this.analyticsDataClient = new BetaAnalyticsDataClient({ auth });
      this.analyticsAdminClient = new AnalyticsAdminServiceClient({ auth });

      console.error('GA4 clients initialized successfully');
    } catch (error) {
      console.error('Error initializing GA4 clients:', error);
      throw error;
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.analyticsDataClient || !this.analyticsAdminClient) {
        await this.initializeClients();
      }

      try {
        return await this.handleToolCall(request.params.name, request.params.arguments);
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'get_property_details',
        description: 'Obtiene los detalles de la propiedad GA4 incluyendo configuración básica',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_data_streams',
        description: 'Lista todos los data streams configurados en la propiedad',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_conversion_events',
        description: 'Obtiene todos los eventos de conversión configurados',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_custom_events',
        description: 'Lista eventos personalizados con sus parámetros',
        inputSchema: {
          type: 'object',
          properties: {
            daysAgo: {
              type: 'number',
              description: 'Número de días atrás para analizar (default: 7)',
              default: 7,
            },
          },
        },
      },
      {
        name: 'get_audiences',
        description: 'Lista todas las audiencias configuradas',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'check_google_ads_link',
        description: 'Verifica si hay vinculación con Google Ads',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'check_enhanced_measurement',
        description: 'Verifica el estado de enhanced measurement en cada stream',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_data_retention',
        description: 'Obtiene la configuración de retención de datos',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'run_realtime_report',
        description: 'Ejecuta un reporte en tiempo real para verificar tracking',
        inputSchema: {
          type: 'object',
          properties: {
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Métricas a incluir (ej: activeUsers)',
            },
          },
        },
      },
      {
        name: 'get_events_summary',
        description: 'Obtiene un resumen de eventos en los últimos días con counts',
        inputSchema: {
          type: 'object',
          properties: {
            daysAgo: {
              type: 'number',
              description: 'Número de días atrás (default: 7)',
              default: 7,
            },
          },
        },
      },
    ];
  }

  private async handleToolCall(toolName: string, args: any): Promise<any> {
    const propertyPath = `properties/${this.config.propertyId}`;

    switch (toolName) {
      case 'get_property_details': {
        const [property] = await this.analyticsAdminClient!.getProperty({
          name: propertyPath,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  name: property.name,
                  displayName: property.displayName,
                  timeZone: property.timeZone,
                  currencyCode: property.currencyCode,
                  industryCategory: property.industryCategory,
                  createTime: property.createTime,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_data_streams': {
        const [streams] = await this.analyticsAdminClient!.listDataStreams({
          parent: propertyPath,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                streams.map((stream) => ({
                  name: stream.name,
                  displayName: stream.displayName,
                  type: stream.type,
                  webStreamData: stream.webStreamData,
                  androidAppStreamData: stream.androidAppStreamData,
                  iosAppStreamData: stream.iosAppStreamData,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_conversion_events': {
        const [events] = await this.analyticsAdminClient!.listConversionEvents({
          parent: propertyPath,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                events.map((event) => ({
                  name: event.name,
                  eventName: event.eventName,
                  createTime: event.createTime,
                  deletable: event.deletable,
                  custom: event.custom,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_custom_events': {
        const daysAgo = args?.daysAgo || 7;
        const [response] = await this.analyticsDataClient!.runReport({
          property: propertyPath,
          dateRanges: [
            {
              startDate: `${daysAgo}daysAgo`,
              endDate: 'today',
            },
          ],
          dimensions: [{ name: 'eventName' }, { name: 'customEvent' }],
          metrics: [{ name: 'eventCount' }],
          limit: 100,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  dateRange: `${daysAgo} días atrás hasta hoy`,
                  events: response.rows?.map((row) => ({
                    eventName: row.dimensionValues?.[0]?.value,
                    isCustom: row.dimensionValues?.[1]?.value,
                    count: row.metricValues?.[0]?.value,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_audiences': {
        const [audiences] = await this.analyticsAdminClient!.listAudiences({
          parent: propertyPath,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                audiences.map((audience) => ({
                  name: audience.name,
                  displayName: audience.displayName,
                  description: audience.description,
                  membershipDurationDays: audience.membershipDurationDays,
                  filterClauses: audience.filterClauses?.length || 0,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'check_google_ads_link': {
        try {
          const [links] = await this.analyticsAdminClient!.listGoogleAdsLinks({
            parent: propertyPath,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    hasLinks: links.length > 0,
                    linksCount: links.length,
                    links: links.map((link) => ({
                      name: link.name,
                      customerId: link.customerId,
                      canManageClients: link.canManageClients,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ hasLinks: false, error: error.message }),
              },
            ],
          };
        }
      }

      case 'check_enhanced_measurement': {
        const [streams] = await this.analyticsAdminClient!.listDataStreams({
          parent: propertyPath,
        });

        const enhancedMeasurementStatuses = await Promise.all(
          streams.map(async (stream) => {
            try {
              const [settings] =
                await this.analyticsAdminClient!.getEnhancedMeasurementSettings({
                  name: `${stream.name}/enhancedMeasurementSettings`,
                });

              return {
                streamName: stream.displayName,
                enabled: settings.streamEnabled,
                pageViews: settings.pageViewsEnabled,
                scrolls: settings.scrollsEnabled,
                outboundClicks: settings.outboundClicksEnabled,
                siteSearch: settings.siteSearchEnabled,
                formInteractions: settings.formInteractionsEnabled,
                videoEngagement: settings.videoEngagementEnabled,
                fileDownloads: settings.fileDownloadsEnabled,
              };
            } catch (error) {
              return {
                streamName: stream.displayName,
                error: 'Could not retrieve enhanced measurement settings',
              };
            }
          })
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(enhancedMeasurementStatuses, null, 2),
            },
          ],
        };
      }

      case 'get_data_retention': {
        const [settings] =
          await this.analyticsAdminClient!.getDataRetentionSettings({
            name: `${propertyPath}/dataRetentionSettings`,
          });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  eventDataRetention: settings.eventDataRetention,
                  resetUserDataOnNewActivity: settings.resetUserDataOnNewActivity,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'run_realtime_report': {
        const metrics = args?.metrics || ['activeUsers'];
        const [response] = await this.analyticsDataClient!.runRealtimeReport({
          property: propertyPath,
          metrics: metrics.map((name: string) => ({ name })),
          dimensions: [{ name: 'country' }],
          limit: 10,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalUsers: response.totals?.[0]?.metricValues?.[0]?.value,
                  topCountries: response.rows?.map((row) => ({
                    country: row.dimensionValues?.[0]?.value,
                    activeUsers: row.metricValues?.[0]?.value,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_events_summary': {
        const daysAgo = args?.daysAgo || 7;
        const [response] = await this.analyticsDataClient!.runReport({
          property: propertyPath,
          dateRanges: [
            {
              startDate: `${daysAgo}daysAgo`,
              endDate: 'today',
            },
          ],
          dimensions: [{ name: 'eventName' }],
          metrics: [{ name: 'eventCount' }],
          orderBys: [
            {
              metric: { metricName: 'eventCount' },
              desc: true,
            },
          ],
          limit: 50,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  period: `Últimos ${daysAgo} días`,
                  totalEvents: response.rowCount,
                  topEvents: response.rows?.map((row) => ({
                    eventName: row.dimensionValues?.[0]?.value,
                    count: row.metricValues?.[0]?.value,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('GA4 MCP Server running on stdio');
  }
}

// Main execution
const config: GA4Config = {
  propertyId: process.env.GA4_PROPERTY_ID || '',
  credentialsPath: process.env.GA4_CREDENTIALS_PATH || './credentials/ga4-credentials.json',
};

if (!config.propertyId) {
  console.error('Error: GA4_PROPERTY_ID environment variable is required');
  process.exit(1);
}

const server = new GA4MCPServer(config);
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

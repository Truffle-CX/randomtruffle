#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { GoogleAdsApi, Customer } from 'google-ads-api';
import * as dotenv from 'dotenv';

dotenv.config();

interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  developerToken: string;
  refreshToken: string;
  customerId: string;
}

class GoogleAdsMCPServer {
  private server: Server;
  private client: GoogleAdsApi | null = null;
  private customer: Customer | null = null;
  private config: GoogleAdsConfig;

  constructor(config: GoogleAdsConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: 'google-ads-mcp-server',
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

  private async initializeClient() {
    try {
      this.client = new GoogleAdsApi({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        developer_token: this.config.developerToken,
      });

      this.customer = this.client.Customer({
        customer_id: this.config.customerId,
        refresh_token: this.config.refreshToken,
      });

      console.error('Google Ads client initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Ads client:', error);
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.client || !this.customer) {
        await this.initializeClient();
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
        name: 'get_account_info',
        description: 'Obtiene información básica de la cuenta de Google Ads',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_campaigns',
        description: 'Lista todas las campañas con su estado y tipo',
        inputSchema: {
          type: 'object',
          properties: {
            includeRemoved: {
              type: 'boolean',
              description: 'Incluir campañas eliminadas',
              default: false,
            },
          },
        },
      },
      {
        name: 'get_conversion_actions',
        description: 'Obtiene todas las conversiones configuradas',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_campaign_performance',
        description: 'Obtiene métricas de rendimiento de campañas',
        inputSchema: {
          type: 'object',
          properties: {
            daysAgo: {
              type: 'number',
              description: 'Número de días atrás (default: 30)',
              default: 30,
            },
          },
        },
      },
      {
        name: 'check_conversion_tracking',
        description: 'Verifica el estado del tracking de conversiones',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_ad_groups',
        description: 'Lista grupos de anuncios con su estructura',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: {
              type: 'string',
              description: 'ID de campaña específica (opcional)',
            },
          },
        },
      },
      {
        name: 'get_keywords_quality',
        description: 'Analiza la calidad de keywords principales',
        inputSchema: {
          type: 'object',
          properties: {
            minImpressions: {
              type: 'number',
              description: 'Mínimo de impresiones para incluir keyword',
              default: 100,
            },
          },
        },
      },
      {
        name: 'get_ad_extensions',
        description: 'Lista todas las extensiones de anuncios configuradas',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_audience_lists',
        description: 'Obtiene listas de audiencias y remarketing',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_bidding_strategies',
        description: 'Analiza las estrategias de puja en uso',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_responsive_search_ads',
        description: 'Analiza la calidad de Responsive Search Ads',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Número máximo de ads a retornar',
              default: 50,
            },
          },
        },
      },
      {
        name: 'check_enhanced_conversions',
        description: 'Verifica si enhanced conversions está activado',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  private async handleToolCall(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'get_account_info': {
        const query = `
          SELECT
            customer.id,
            customer.descriptive_name,
            customer.currency_code,
            customer.time_zone,
            customer.manager,
            customer.test_account
          FROM customer
          WHERE customer.id = ${this.config.customerId}
        `;

        const [response] = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  customerId: response.customer?.id,
                  name: response.customer?.descriptive_name,
                  currency: response.customer?.currency_code,
                  timeZone: response.customer?.time_zone,
                  isManager: response.customer?.manager,
                  isTestAccount: response.customer?.test_account,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_campaigns': {
        const includeRemoved = args?.includeRemoved || false;
        const statusFilter = includeRemoved
          ? ''
          : "AND campaign.status != 'REMOVED'";

        const query = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            campaign.advertising_channel_type,
            campaign.bidding_strategy_type,
            campaign.start_date,
            campaign.end_date
          FROM campaign
          WHERE campaign.status != 'REMOVED'
          ORDER BY campaign.name
        `;

        const campaigns = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                campaigns.map((c) => ({
                  id: c.campaign?.id,
                  name: c.campaign?.name,
                  status: c.campaign?.status,
                  type: c.campaign?.advertising_channel_type,
                  biddingStrategy: c.campaign?.bidding_strategy_type,
                  startDate: c.campaign?.start_date,
                  endDate: c.campaign?.end_date,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_conversion_actions': {
        const query = `
          SELECT
            conversion_action.id,
            conversion_action.name,
            conversion_action.type,
            conversion_action.status,
            conversion_action.category,
            conversion_action.primary_for_goal,
            conversion_action.value_settings.default_value,
            conversion_action.counting_type
          FROM conversion_action
          WHERE conversion_action.status != 'REMOVED'
          ORDER BY conversion_action.name
        `;

        const conversions = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                conversions.map((c) => ({
                  id: c.conversion_action?.id,
                  name: c.conversion_action?.name,
                  type: c.conversion_action?.type,
                  status: c.conversion_action?.status,
                  category: c.conversion_action?.category,
                  isPrimary: c.conversion_action?.primary_for_goal,
                  defaultValue: c.conversion_action?.value_settings?.default_value,
                  countingType: c.conversion_action?.counting_type,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_campaign_performance': {
        const daysAgo = args?.daysAgo || 30;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        const formatDate = (date: Date) => {
          return date.toISOString().split('T')[0].replace(/-/g, '');
        };

        const query = `
          SELECT
            campaign.id,
            campaign.name,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_per_conversion
          FROM campaign
          WHERE segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
            AND campaign.status = 'ENABLED'
          ORDER BY metrics.cost_micros DESC
        `;

        const performance = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  period: `Últimos ${daysAgo} días`,
                  campaigns: performance.map((p) => ({
                    id: p.campaign?.id,
                    name: p.campaign?.name,
                    impressions: p.metrics?.impressions,
                    clicks: p.metrics?.clicks,
                    ctr: p.metrics?.ctr,
                    avgCpc: (p.metrics?.average_cpc || 0) / 1000000,
                    cost: (p.metrics?.cost_micros || 0) / 1000000,
                    conversions: p.metrics?.conversions,
                    conversionValue: p.metrics?.conversions_value,
                    costPerConversion: p.metrics?.cost_per_conversion,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'check_conversion_tracking': {
        const query = `
          SELECT
            customer.id,
            customer.conversion_tracking_setting.conversion_tracking_id,
            customer.conversion_tracking_setting.cross_account_conversion_tracking_id,
            customer.conversion_tracking_setting.accepted_customer_data_terms,
            customer.remarketing_setting.google_global_site_tag
          FROM customer
          WHERE customer.id = ${this.config.customerId}
        `;

        const [response] = await this.customer!.query(query);

        const conversionsQuery = `
          SELECT
            conversion_action.id,
            conversion_action.name,
            conversion_action.status
          FROM conversion_action
          WHERE conversion_action.status != 'REMOVED'
        `;

        const conversions = await this.customer!.query(conversionsQuery);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  trackingId:
                    response.customer?.conversion_tracking_setting
                      ?.conversion_tracking_id,
                  hasTracking: !!response.customer?.conversion_tracking_setting
                    ?.conversion_tracking_id,
                  globalSiteTag:
                    response.customer?.remarketing_setting?.google_global_site_tag,
                  totalConversions: conversions.length,
                  activeConversions: conversions.filter(
                    (c) => c.conversion_action?.status === 'ENABLED'
                  ).length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_ad_groups': {
        let query = `
          SELECT
            ad_group.id,
            ad_group.name,
            ad_group.status,
            ad_group.type,
            campaign.id,
            campaign.name
          FROM ad_group
          WHERE ad_group.status != 'REMOVED'
        `;

        if (args?.campaignId) {
          query += ` AND campaign.id = ${args.campaignId}`;
        }

        query += ' ORDER BY campaign.name, ad_group.name';

        const adGroups = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                adGroups.map((ag) => ({
                  id: ag.ad_group?.id,
                  name: ag.ad_group?.name,
                  status: ag.ad_group?.status,
                  type: ag.ad_group?.type,
                  campaignId: ag.campaign?.id,
                  campaignName: ag.campaign?.name,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_keywords_quality': {
        const minImpressions = args?.minImpressions || 100;
        const query = `
          SELECT
            ad_group_criterion.criterion_id,
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.quality_info.quality_score,
            ad_group_criterion.status,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            campaign.name,
            ad_group.name
          FROM keyword_view
          WHERE segments.date DURING LAST_30_DAYS
            AND metrics.impressions >= ${minImpressions}
            AND ad_group_criterion.status = 'ENABLED'
          ORDER BY metrics.impressions DESC
          LIMIT 100
        `;

        const keywords = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalKeywords: keywords.length,
                  keywords: keywords.map((k) => ({
                    id: k.ad_group_criterion?.criterion_id,
                    text: k.ad_group_criterion?.keyword?.text,
                    matchType: k.ad_group_criterion?.keyword?.match_type,
                    qualityScore: k.ad_group_criterion?.quality_info?.quality_score,
                    status: k.ad_group_criterion?.status,
                    impressions: k.metrics?.impressions,
                    clicks: k.metrics?.clicks,
                    ctr: k.metrics?.ctr,
                    avgCpc: (k.metrics?.average_cpc || 0) / 1000000,
                    campaign: k.campaign?.name,
                    adGroup: k.ad_group?.name,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_ad_extensions': {
        const query = `
          SELECT
            asset.type,
            asset.name,
            asset.sitelink_asset.description1,
            asset.sitelink_asset.description2,
            asset.call_asset.phone_number,
            asset.callout_asset.callout_text,
            asset.structured_snippet_asset.header,
            campaign.name
          FROM campaign_asset
          WHERE campaign_asset.status = 'ENABLED'
        `;

        const extensions = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalExtensions: extensions.length,
                  extensionsByType: extensions.reduce((acc: any, ext) => {
                    const type = ext.asset?.type || 'UNKNOWN';
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {}),
                  extensions: extensions.slice(0, 50).map((e) => ({
                    type: e.asset?.type,
                    name: e.asset?.name,
                    campaign: e.campaign?.name,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_audience_lists': {
        const query = `
          SELECT
            user_list.id,
            user_list.name,
            user_list.type,
            user_list.size_for_display,
            user_list.size_for_search,
            user_list.membership_status,
            user_list.membership_life_span
          FROM user_list
          WHERE user_list.closing_reason = 'UNUSED'
            OR user_list.closing_reason IS NULL
          ORDER BY user_list.name
        `;

        const audiences = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalAudiences: audiences.length,
                  audiences: audiences.map((a) => ({
                    id: a.user_list?.id,
                    name: a.user_list?.name,
                    type: a.user_list?.type,
                    sizeDisplay: a.user_list?.size_for_display,
                    sizeSearch: a.user_list?.size_for_search,
                    membershipStatus: a.user_list?.membership_status,
                    membershipLifeSpan: a.user_list?.membership_life_span,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_bidding_strategies': {
        const query = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.bidding_strategy_type,
            campaign.target_cpa.target_cpa_micros,
            campaign.target_roas.target_roas,
            campaign.maximize_conversions.target_cpa_micros
          FROM campaign
          WHERE campaign.status = 'ENABLED'
          ORDER BY campaign.name
        `;

        const campaigns = await this.customer!.query(query);

        const strategyCount = campaigns.reduce((acc: any, c) => {
          const strategy = c.campaign?.bidding_strategy_type || 'UNKNOWN';
          acc[strategy] = (acc[strategy] || 0) + 1;
          return acc;
        }, {});

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  strategyDistribution: strategyCount,
                  campaigns: campaigns.map((c) => ({
                    id: c.campaign?.id,
                    name: c.campaign?.name,
                    biddingStrategy: c.campaign?.bidding_strategy_type,
                    targetCpa: c.campaign?.target_cpa?.target_cpa_micros
                      ? c.campaign.target_cpa.target_cpa_micros / 1000000
                      : null,
                    targetRoas: c.campaign?.target_roas?.target_roas,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_responsive_search_ads': {
        const limit = args?.limit || 50;
        const query = `
          SELECT
            ad_group_ad.ad.id,
            ad_group_ad.ad.name,
            ad_group_ad.ad.responsive_search_ad.headlines,
            ad_group_ad.ad.responsive_search_ad.descriptions,
            ad_group_ad.policy_summary.approval_status,
            ad_group.name,
            campaign.name
          FROM ad_group_ad
          WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
            AND ad_group_ad.status = 'ENABLED'
          LIMIT ${limit}
        `;

        const ads = await this.customer!.query(query);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalAds: ads.length,
                  ads: ads.map((ad) => ({
                    id: ad.ad_group_ad?.ad?.id,
                    name: ad.ad_group_ad?.ad?.name,
                    headlinesCount:
                      ad.ad_group_ad?.ad?.responsive_search_ad?.headlines?.length || 0,
                    descriptionsCount:
                      ad.ad_group_ad?.ad?.responsive_search_ad?.descriptions?.length || 0,
                    approvalStatus:
                      ad.ad_group_ad?.policy_summary?.approval_status,
                    campaign: ad.campaign?.name,
                    adGroup: ad.ad_group?.name,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'check_enhanced_conversions': {
        const query = `
          SELECT
            conversion_action.id,
            conversion_action.name,
            conversion_action.click_through_lookback_window_days,
            conversion_action.enhanced_conversions_for_leads_enabled
          FROM conversion_action
          WHERE conversion_action.status = 'ENABLED'
        `;

        const conversions = await this.customer!.query(query);

        const enhancedCount = conversions.filter(
          (c) => c.conversion_action?.enhanced_conversions_for_leads_enabled
        ).length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalConversions: conversions.length,
                  enhancedConversionsEnabled: enhancedCount,
                  percentageWithEnhanced:
                    conversions.length > 0
                      ? ((enhancedCount / conversions.length) * 100).toFixed(2)
                      : 0,
                  conversions: conversions.map((c) => ({
                    id: c.conversion_action?.id,
                    name: c.conversion_action?.name,
                    enhancedEnabled:
                      c.conversion_action?.enhanced_conversions_for_leads_enabled,
                    lookbackWindow:
                      c.conversion_action?.click_through_lookback_window_days,
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
    console.error('Google Ads MCP Server running on stdio');
  }
}

// Main execution
const config: GoogleAdsConfig = {
  clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || '',
};

const requiredFields = [
  'clientId',
  'clientSecret',
  'developerToken',
  'refreshToken',
  'customerId',
];
const missingFields = requiredFields.filter((field) => !config[field as keyof GoogleAdsConfig]);

if (missingFields.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingFields.join(', ')}`);
  process.exit(1);
}

const server = new GoogleAdsMCPServer(config);
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { MCPClient } from '../mcp/mcp-client.js';
import { SYSTEM_INSTRUCTIONS, getMaturityLevel, SCORING_RULES } from '../config/system-instructions.js';
import { Logger } from '../utils/logger.js';

export interface HealthCheckRequest {
  platforms: ('ga4' | 'google-ads' | 'meta')[];
  clientName: string;
  userId: string;
}

export interface HealthCheckResult {
  clientName: string;
  timestamp: string;
  totalScore: number;
  maturityLevel: {
    level: number;
    label: string;
    emoji: string;
  };
  platforms: {
    ga4?: PlatformScore;
    'google-ads'?: PlatformScore;
    meta?: PlatformScore;
  };
  report: string;
  recommendations: string[];
}

export interface PlatformScore {
  score: number;
  maxScore: number;
  percentage: number;
  maturityLevel: {
    level: number;
    label: string;
    emoji: string;
  };
  checklist: ChecklistItem[];
}

export interface ChecklistItem {
  category: string;
  item: string;
  status: 'implemented' | 'partial' | 'missing';
  points: number;
  maxPoints: number;
}

export class MarketingHealthCheckAgent {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private mcpClient: MCPClient;
  private logger: Logger;

  constructor(apiKey: string, modelName: string = 'gemini-2.0-flash-exp') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.logger = new Logger('MarketingAgent');

    // Initialize the model with system instructions
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTIONS,
    });

    this.mcpClient = new MCPClient();

    this.logger.info('Marketing Health Check Agent initialized');
  }

  async initialize(): Promise<void> {
    try {
      await this.mcpClient.initialize();
      this.logger.info('MCP clients initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing MCP clients:', error);
      throw error;
    }
  }

  async performHealthCheck(request: HealthCheckRequest): Promise<HealthCheckResult> {
    this.logger.info(`Starting health check for ${request.clientName}`, {
      platforms: request.platforms,
      userId: request.userId,
    });

    try {
      const platformResults: any = {};
      let totalScore = 0;
      let maxTotalScore = 0;

      // Collect data from each platform
      for (const platform of request.platforms) {
        this.logger.info(`Analyzing platform: ${platform}`);

        let platformData;
        switch (platform) {
          case 'ga4':
            platformData = await this.analyzeGA4();
            break;
          case 'google-ads':
            platformData = await this.analyzeGoogleAds();
            break;
          case 'meta':
            platformData = await this.analyzeMetaAds();
            break;
        }

        if (platformData) {
          platformResults[platform] = platformData;
          totalScore += platformData.score;
          maxTotalScore += platformData.maxScore;
        }
      }

      // Generate comprehensive report using Gemini
      const reportPrompt = this.buildReportPrompt(request, platformResults);
      const reportResult = await this.model.generateContent(reportPrompt);
      const report = reportResult.response.text();

      // Extract recommendations
      const recommendations = await this.generateRecommendations(platformResults);

      const overallPercentage = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;
      const maturityLevel = getMaturityLevel(overallPercentage);

      const result: HealthCheckResult = {
        clientName: request.clientName,
        timestamp: new Date().toISOString(),
        totalScore: Math.round(overallPercentage),
        maturityLevel,
        platforms: platformResults,
        report,
        recommendations,
      };

      this.logger.info(`Health check completed for ${request.clientName}`, {
        totalScore: result.totalScore,
        maturityLevel: maturityLevel.label,
      });

      return result;
    } catch (error) {
      this.logger.error('Error performing health check:', error);
      throw error;
    }
  }

  private async analyzeGA4(): Promise<PlatformScore> {
    try {
      // Collect all necessary data from GA4
      const [
        propertyDetails,
        dataStreams,
        conversionEvents,
        customEvents,
        audiences,
        googleAdsLink,
        enhancedMeasurement,
        dataRetention,
        eventsSummary,
      ] = await Promise.all([
        this.mcpClient.callGA4Tool('get_property_details', {}),
        this.mcpClient.callGA4Tool('get_data_streams', {}),
        this.mcpClient.callGA4Tool('get_conversion_events', {}),
        this.mcpClient.callGA4Tool('get_custom_events', { daysAgo: 7 }),
        this.mcpClient.callGA4Tool('get_audiences', {}),
        this.mcpClient.callGA4Tool('check_google_ads_link', {}),
        this.mcpClient.callGA4Tool('check_enhanced_measurement', {}),
        this.mcpClient.callGA4Tool('get_data_retention', {}),
        this.mcpClient.callGA4Tool('get_events_summary', { daysAgo: 7 }),
      ]);

      // Use Gemini to analyze and score the data
      const analysisPrompt = `
Analiza los siguientes datos de GA4 y proporciona un scoring detallado según el checklist definido en tus instrucciones:

Property Details:
${JSON.stringify(propertyDetails, null, 2)}

Data Streams:
${JSON.stringify(dataStreams, null, 2)}

Conversion Events:
${JSON.stringify(conversionEvents, null, 2)}

Custom Events:
${JSON.stringify(customEvents, null, 2)}

Audiences:
${JSON.stringify(audiences, null, 2)}

Google Ads Link:
${JSON.stringify(googleAdsLink, null, 2)}

Enhanced Measurement:
${JSON.stringify(enhancedMeasurement, null, 2)}

Data Retention:
${JSON.stringify(dataRetention, null, 2)}

Events Summary:
${JSON.stringify(eventsSummary, null, 2)}

Proporciona el scoring en formato JSON con esta estructura:
{
  "score": <número total de puntos obtenidos>,
  "maxScore": 100,
  "checklist": [
    {
      "category": "Configuración Básica",
      "item": "Descripción del item",
      "status": "implemented|partial|missing",
      "points": <puntos obtenidos>,
      "maxPoints": <puntos máximos>
    }
  ]
}
`;

      const analysisResult = await this.model.generateContent(analysisPrompt);
      const analysisText = analysisResult.response.text();

      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse GA4 analysis response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      const percentage = (analysis.score / analysis.maxScore) * 100;

      return {
        score: analysis.score,
        maxScore: analysis.maxScore,
        percentage: Math.round(percentage),
        maturityLevel: getMaturityLevel(percentage),
        checklist: analysis.checklist,
      };
    } catch (error) {
      this.logger.error('Error analyzing GA4:', error);
      throw error;
    }
  }

  private async analyzeGoogleAds(): Promise<PlatformScore> {
    try {
      // Collect all necessary data from Google Ads
      const [
        accountInfo,
        campaigns,
        conversionActions,
        campaignPerformance,
        conversionTracking,
        adGroups,
        keywordsQuality,
        adExtensions,
        audienceLists,
        biddingStrategies,
        responsiveSearchAds,
        enhancedConversions,
      ] = await Promise.all([
        this.mcpClient.callGoogleAdsTool('get_account_info', {}),
        this.mcpClient.callGoogleAdsTool('get_campaigns', {}),
        this.mcpClient.callGoogleAdsTool('get_conversion_actions', {}),
        this.mcpClient.callGoogleAdsTool('get_campaign_performance', { daysAgo: 30 }),
        this.mcpClient.callGoogleAdsTool('check_conversion_tracking', {}),
        this.mcpClient.callGoogleAdsTool('get_ad_groups', {}),
        this.mcpClient.callGoogleAdsTool('get_keywords_quality', { minImpressions: 100 }),
        this.mcpClient.callGoogleAdsTool('get_ad_extensions', {}),
        this.mcpClient.callGoogleAdsTool('get_audience_lists', {}),
        this.mcpClient.callGoogleAdsTool('get_bidding_strategies', {}),
        this.mcpClient.callGoogleAdsTool('get_responsive_search_ads', { limit: 50 }),
        this.mcpClient.callGoogleAdsTool('check_enhanced_conversions', {}),
      ]);

      const analysisPrompt = `
Analiza los siguientes datos de Google Ads y proporciona un scoring detallado según el checklist definido:

Account Info:
${JSON.stringify(accountInfo, null, 2)}

Campaigns:
${JSON.stringify(campaigns, null, 2)}

Conversion Actions:
${JSON.stringify(conversionActions, null, 2)}

Campaign Performance:
${JSON.stringify(campaignPerformance, null, 2)}

Conversion Tracking:
${JSON.stringify(conversionTracking, null, 2)}

Ad Groups:
${JSON.stringify(adGroups, null, 2)}

Keywords Quality:
${JSON.stringify(keywordsQuality, null, 2)}

Ad Extensions:
${JSON.stringify(adExtensions, null, 2)}

Audience Lists:
${JSON.stringify(audienceLists, null, 2)}

Bidding Strategies:
${JSON.stringify(biddingStrategies, null, 2)}

Responsive Search Ads:
${JSON.stringify(responsiveSearchAds, null, 2)}

Enhanced Conversions:
${JSON.stringify(enhancedConversions, null, 2)}

Proporciona el scoring en formato JSON con la misma estructura que GA4.
`;

      const analysisResult = await this.model.generateContent(analysisPrompt);
      const analysisText = analysisResult.response.text();

      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse Google Ads analysis response');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      const percentage = (analysis.score / analysis.maxScore) * 100;

      return {
        score: analysis.score,
        maxScore: analysis.maxScore,
        percentage: Math.round(percentage),
        maturityLevel: getMaturityLevel(percentage),
        checklist: analysis.checklist,
      };
    } catch (error) {
      this.logger.error('Error analyzing Google Ads:', error);
      throw error;
    }
  }

  private async analyzeMetaAds(): Promise<PlatformScore> {
    // For Meta, we'll create a basic implementation
    // In a real scenario, you would integrate with Meta's Marketing API
    this.logger.warn('Meta Ads analysis not fully implemented - using mock data');

    return {
      score: 65,
      maxScore: 100,
      percentage: 65,
      maturityLevel: getMaturityLevel(65),
      checklist: [
        {
          category: 'Configuración de Cuenta',
          item: 'Business Manager configurado',
          status: 'implemented',
          points: 3,
          maxPoints: 3,
        },
        {
          category: 'Pixel y Tracking',
          item: 'Meta Pixel implementado',
          status: 'partial',
          points: 3,
          maxPoints: 5,
        },
      ],
    };
  }

  private buildReportPrompt(request: HealthCheckRequest, platformResults: any): string {
    return `
Genera un reporte completo de Health Check para el cliente "${request.clientName}".

Datos de las plataformas analizadas:
${JSON.stringify(platformResults, null, 2)}

Genera el reporte siguiendo EXACTAMENTE el formato especificado en tus system instructions,
incluyendo:
- Resumen ejecutivo con puntuaciones
- Análisis detallado por plataforma
- Fortalezas, oportunidades de mejora y críticos
- Recomendaciones priorizadas (Quick Wins, Medio Plazo, Largo Plazo)
- Próximos pasos

El reporte debe ser profesional, accionable y fácil de entender.
`;
  }

  private async generateRecommendations(platformResults: any): Promise<string[]> {
    const recommendationsPrompt = `
Basándote en los siguientes resultados del health check:
${JSON.stringify(platformResults, null, 2)}

Genera una lista de las 10 recomendaciones más importantes, priorizadas por impacto y facilidad de implementación.
Cada recomendación debe ser específica y accionable.

Responde SOLO con un array JSON de strings:
["Recomendación 1", "Recomendación 2", ...]
`;

    const result = await this.model.generateContent(recommendationsPrompt);
    const text = result.response.text();

    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.error('Error parsing recommendations:', error);
    }

    return ['Error generando recomendaciones'];
  }

  async chat(message: string, conversationHistory: any[] = []): Promise<string> {
    try {
      const chat = this.model.startChat({
        history: conversationHistory,
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error) {
      this.logger.error('Error in chat:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.mcpClient.close();
    this.logger.info('Marketing Health Check Agent closed');
  }
}

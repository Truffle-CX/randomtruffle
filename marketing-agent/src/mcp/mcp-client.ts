import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../utils/logger.js';

export class MCPClient {
  private ga4Client: Client | null = null;
  private googleAdsClient: Client | null = null;
  private ga4Process: ChildProcess | null = null;
  private googleAdsProcess: ChildProcess | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('MCPClient');
  }

  async initialize(): Promise<void> {
    try {
      // Initialize GA4 MCP Server
      await this.initializeGA4Client();

      // Initialize Google Ads MCP Server
      await this.initializeGoogleAdsClient();

      this.logger.info('All MCP clients initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing MCP clients:', error);
      throw error;
    }
  }

  private async initializeGA4Client(): Promise<void> {
    try {
      const serverPath = process.env.MCP_GA4_SERVER_PATH || './mcp-servers/ga4/dist/index.js';

      this.logger.info(`Initializing GA4 MCP client with server at ${serverPath}`);

      this.ga4Process = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
        },
      });

      this.ga4Process.stderr?.on('data', (data) => {
        this.logger.debug(`GA4 Server: ${data.toString()}`);
      });

      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: process.env,
      });

      this.ga4Client = new Client(
        {
          name: 'marketing-agent-ga4-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.ga4Client.connect(transport);
      this.logger.info('GA4 MCP client connected');
    } catch (error) {
      this.logger.error('Error initializing GA4 client:', error);
      throw error;
    }
  }

  private async initializeGoogleAdsClient(): Promise<void> {
    try {
      const serverPath = process.env.MCP_GOOGLE_ADS_SERVER_PATH || './mcp-servers/google-ads/dist/index.js';

      this.logger.info(`Initializing Google Ads MCP client with server at ${serverPath}`);

      this.googleAdsProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
        },
      });

      this.googleAdsProcess.stderr?.on('data', (data) => {
        this.logger.debug(`Google Ads Server: ${data.toString()}`);
      });

      const transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        env: process.env,
      });

      this.googleAdsClient = new Client(
        {
          name: 'marketing-agent-google-ads-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.googleAdsClient.connect(transport);
      this.logger.info('Google Ads MCP client connected');
    } catch (error) {
      this.logger.error('Error initializing Google Ads client:', error);
      throw error;
    }
  }

  async callGA4Tool(toolName: string, args: any): Promise<any> {
    if (!this.ga4Client) {
      throw new Error('GA4 client not initialized');
    }

    try {
      this.logger.debug(`Calling GA4 tool: ${toolName}`, args);

      const result = await this.ga4Client.callTool({
        name: toolName,
        arguments: args,
      });

      if (result.isError) {
        throw new Error(`GA4 tool error: ${JSON.stringify(result.content)}`);
      }

      // Extract text content from result
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        return JSON.parse(textContent.text);
      }

      return result.content;
    } catch (error) {
      this.logger.error(`Error calling GA4 tool ${toolName}:`, error);
      throw error;
    }
  }

  async callGoogleAdsTool(toolName: string, args: any): Promise<any> {
    if (!this.googleAdsClient) {
      throw new Error('Google Ads client not initialized');
    }

    try {
      this.logger.debug(`Calling Google Ads tool: ${toolName}`, args);

      const result = await this.googleAdsClient.callTool({
        name: toolName,
        arguments: args,
      });

      if (result.isError) {
        throw new Error(`Google Ads tool error: ${JSON.stringify(result.content)}`);
      }

      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent && 'text' in textContent) {
        return JSON.parse(textContent.text);
      }

      return result.content;
    } catch (error) {
      this.logger.error(`Error calling Google Ads tool ${toolName}:`, error);
      throw error;
    }
  }

  async listGA4Tools(): Promise<any[]> {
    if (!this.ga4Client) {
      throw new Error('GA4 client not initialized');
    }

    const result = await this.ga4Client.listTools();
    return result.tools;
  }

  async listGoogleAdsTools(): Promise<any[]> {
    if (!this.googleAdsClient) {
      throw new Error('Google Ads client not initialized');
    }

    const result = await this.googleAdsClient.listTools();
    return result.tools;
  }

  async close(): Promise<void> {
    if (this.ga4Client) {
      await this.ga4Client.close();
      this.ga4Client = null;
    }

    if (this.googleAdsClient) {
      await this.googleAdsClient.close();
      this.googleAdsClient = null;
    }

    if (this.ga4Process) {
      this.ga4Process.kill();
      this.ga4Process = null;
    }

    if (this.googleAdsProcess) {
      this.googleAdsProcess.kill();
      this.googleAdsProcess = null;
    }

    this.logger.info('All MCP clients closed');
  }
}

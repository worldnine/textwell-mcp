#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { URL_SCHEMES, TIMEOUT } from './config/url-schemes.js';
import { executeUrlScheme } from './utils/url-scheme-executor.js';

class TextwellServer {
  private server: Server;
  private isConnected: boolean = false;

  constructor() {
    this.server = new Server(
      {
        name: 'textwell-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          logging: {
            supportedLevels: ['info', 'warning', 'error']
          }
        }
      }
    );

    this.setupToolHandlers();

    // エラーハンドリング
    this.server.onerror = (error) => {
      this.server.sendLoggingMessage({
        level: 'error',
        data: `Server error: ${error.message}`
      });
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async executeUrlScheme(url: string): Promise<void> {
    this.ensureConnection();
    
    return executeUrlScheme(url, {
      timeout: TIMEOUT,
      onLog: (level, message) => {
        this.server.sendLoggingMessage({ level, data: message });
      }
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'write-text',
          description: 'Write text to Textwell application',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Content to write to Textwell'
              },
              mode: {
                type: 'string',
                enum: ['replace', 'insert', 'add'],
                description: 'replace: overwrite all, insert: at cursor, add: at end',
                default: 'replace'
              }
            },
            required: ['text']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.ensureConnection();

      // ツール実行開始時のログ
      try {
        switch (request.params.name) {
          case 'write-text': {
            const { text, mode = 'replace' } = request.params.arguments as {
              text: string;
              mode?: 'replace' | 'insert' | 'add';
            };
            
            this.server.sendLoggingMessage({
              level: "info",
              data: `Textwell: ${mode} text`
            });
            
            const encodedText = encodeURIComponent(text);
            const url = `${URL_SCHEMES[mode]}?text=${encodedText}`;
            
            try {
              await this.executeUrlScheme(url);
              return {
                content: [{
                  type: 'text',
                  text: `Text ${mode} completed`
                }]
              };
            } catch (error) {
              throw new McpError(
                ErrorCode.InternalError,
                `Textwell write failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            }
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        if (error instanceof Error) {
          this.server.sendLoggingMessage({
            level: "error",
            data: `Tool execution failed: ${error.message}`
          });
          throw new McpError(ErrorCode.InternalError, error.message);
        }
        throw new McpError(ErrorCode.InternalError, 'Unknown error occurred');
      }
    });
  }

  private ensureConnection(): void {
    if (!this.isConnected) {
      throw new McpError(
        ErrorCode.InternalError,
        "Server not connected"
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    try {
      await this.server.connect(transport);
      this.isConnected = true;
      this.server.sendLoggingMessage({
        level: "info",
        data: "Server started and ready"
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed to start server: ${error.message}`);
      }
      throw error;
    }
  }
}

const server = new TextwellServer();
server.run().catch(error => {
  if (error instanceof Error) {
    process.stderr.write(`Fatal error: ${error.message}\n`);
  }
});

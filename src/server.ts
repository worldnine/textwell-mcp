#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config/url-schemes.js';
import { executeUrlScheme } from './utils/url-scheme-executor.js';

class TextwellServer {
  private server: Server;
  private isConnected: boolean = false;
  private config = loadConfig();

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
      timeout: this.config.timeout,
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
          description: 'Write text to Textwell',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'Text to write'
              },
              mode: {
                type: 'string',
                enum: ['replace', 'insert', 'add'],
                description: 'How to write - replace all, insert at cursor, or append to end',
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
      this.server.sendLoggingMessage({
        level: "info",
        data: `Executing tool: ${request.params.name}`
      });

      try {
        switch (request.params.name) {
          case 'write-text': {
            const { text, mode = 'replace' } = request.params.arguments as {
              text: string;
              mode?: 'replace' | 'insert' | 'add';
            };
            
            // パラメータログ
            this.server.sendLoggingMessage({
              level: "info",
              data: `Writing text with mode: ${mode}`
            });
            
            // URLスキームの構築
            const encodedText = encodeURIComponent(text);
            const url = `${this.config.paths[mode]}?text=${encodedText}`;
            
            try {
              await this.executeUrlScheme(url);
              return {
                content: [{
                  type: 'text',
                  text: `Text has been ${mode}d successfully`
                }]
              };
            } catch (error) {
              throw new McpError(
                ErrorCode.InternalError,
                `Failed to write text: ${error instanceof Error ? error.message : 'Unknown error'}`
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

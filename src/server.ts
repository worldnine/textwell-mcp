#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
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
          tools: {
            'write-text': {
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
                    description: 'How to write - replace all, insert at cursor, or append to end'
                  }
                },
                required: ['text']
              }
            }
          },
          logging: {
            supportedLevels: ['info', 'warning', 'error']
          }
        },
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
    // Note: このメソッドは実際の環境では、システム固有の方法でURL Schemeを実行する必要があります
    this.server.sendLoggingMessage({
      level: "info",
      data: `Would execute URL scheme: ${url}`
    });
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'setup-textwell',
          description: 'Set up Textwell with required actions',
          inputSchema: {
            type: 'object',
            properties: {
              bridgeUrl: {
                type: 'string',
                description: 'URL of the GitHub Pages bridge'
              }
            },
            required: ['bridgeUrl']
          }
        },
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
                description: 'How to write - replace all, insert at cursor, or append to end'
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
          case 'setup-textwell': {
            const { bridgeUrl } = request.params.arguments as { bridgeUrl: string };
            
            // パラメータログ
            this.server.sendLoggingMessage({
              level: "info",
              data: `Setting up Textwell with bridge URL: ${bridgeUrl}`
            });
            
            const actionSource = `
              (function() {
                const text = encodeURIComponent(T.text);
                T('urlScheme', {
                  url: \`${bridgeUrl}/?text=\${text}\`
                });
              })();
            `;
            
            const url = `textwell:///importAction?${new URLSearchParams({
              title: 'Send to MCP',
              source: actionSource,
              iconTitle: 'upload',
              desc: 'Send text to MCP server'
            })}`;
            
            await this.executeUrlScheme(url);
            
            return {
              content: [{
                type: 'text',
                text: 'Textwell setup completed successfully'
              }]
            };
          }

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
            
            const schemes = {
              replace: 'textwell:///replace',
              insert: 'textwell:///insert',
              add: 'textwell:///add'
            };
            
            const url = `${schemes[mode]}?text=${encodeURIComponent(text)}`;
            await this.executeUrlScheme(url);
            
            return {
              content: [{
                type: 'text',
                text: `Text has been ${mode}d successfully`
              }]
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (error instanceof Error) {
          this.server.sendLoggingMessage({
            level: "error",
            data: `Tool execution failed: ${error.message}`
          });
        }
        throw error;
      }
    });
  }

  private logError(error: Error): void {
    this.ensureConnection();
    this.server.sendLoggingMessage({
      level: "error",
      data: `Error: ${error.message}`
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

import { exec } from 'child_process';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class UrlSchemeExecutionError extends McpError {
  constructor(message: string) {
    super(ErrorCode.InternalError, `URL scheme execution failed: ${message}`);
  }
}

export class UrlSchemeTimeoutError extends McpError {
  constructor(timeout: number) {
    super(
      ErrorCode.InternalError,
      `URL scheme execution timed out after ${timeout}ms`
    );
  }
}

interface ExecuteOptions {
  timeout?: number;
  onLog?: (level: 'info' | 'warning' | 'error', message: string) => void;
}

/**
 * TextwellのURLスキームを実行する
 * macOS専用の実装
 */
export async function executeUrlScheme(
  url: string,
  options: ExecuteOptions = {}
): Promise<void> {
  const { timeout = 5000, onLog } = options;

  const log = (level: 'info' | 'warning' | 'error', message: string) => {
    onLog?.(level, message);
  };

  log('info', `Executing URL scheme: ${url}`);

  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new UrlSchemeTimeoutError(timeout));
    }, timeout);

    exec(`open "${url}"`, (error) => {
      clearTimeout(timer);
      
      if (error) {
        log('error', `Failed to execute URL scheme: ${error.message}`);
        reject(new UrlSchemeExecutionError(error.message));
      } else {
        log('info', 'URL scheme executed successfully');
        resolve();
      }
    });
  });
}
/**
 * Textwell MCP constants
 */
export const BRIDGE_URL = 'https://worldnine.github.io/textwell-mcp/';

export const URL_SCHEME_VALIDATION_TIMEOUT = 3000; // 3 seconds

/**
 * Textwell specific error messages
 */
export const ERROR_MESSAGES = {
  URL_SCHEME_NO_RESPONSE: 'Textwell did not respond to the URL scheme',
  BRIDGE_SETUP_FAILED: 'Failed to setup Textwell bridge',
  TEXT_OPERATION_FAILED: 'Text operation failed in Textwell'
} as const;
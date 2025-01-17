/**
 * Textwell URL scheme configuration
 */
export interface UrlSchemeConfig {
  paths: {
    replace: string;
    insert: string;
    add: string;
    importAction: string;
  };
  timeout: number;
}

export const defaultConfig: UrlSchemeConfig = {
  paths: {
    replace: 'textwell:///replace',
    insert: 'textwell:///insert',
    add: 'textwell:///add',
    importAction: 'textwell:///importAction'
  },
  timeout: 5000 // 5 seconds timeout
};

// 環境変数からカスタム設定を読み込む
export function loadConfig(): UrlSchemeConfig {
  try {
    const customConfig = process.env.TEXTWELL_CONFIG 
      ? JSON.parse(process.env.TEXTWELL_CONFIG)
      : {};
      
    return {
      ...defaultConfig,
      ...customConfig
    };
  } catch (error) {
    console.warn('Failed to parse custom config, using defaults');
    return defaultConfig;
  }
}
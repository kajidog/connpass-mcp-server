/**
 * Connpass MCP Apps サーバー設定
 *
 * 優先順位: CLI引数 > 環境変数 > デフォルト値
 */

import {
  type BaseServerConfig,
  type ConfigDefs,
  baseConfigDefs,
  filterUndefined,
  generateHelp,
  getDefaultsFromDefs,
  parseCliFromDefs,
  parseEnvFromDefs,
} from "@kajidog/mcp-core";

const connpassConfigDefs: ConfigDefs = {
  connpassApiKey: {
    cli: "--connpass-api-key",
    env: "CONNPASS_API_KEY",
    description: "Connpass API key",
    group: "Connpass Configuration",
    type: "string",
    valueName: "<key>",
  },
  defaultUserId: {
    cli: "--default-user-id",
    env: "CONNPASS_DEFAULT_USER_ID",
    description: "Default Connpass user ID for schedule search",
    group: "Connpass Configuration",
    type: "number",
    valueName: "<id>",
  },
  rateLimitEnabled: {
    cli: "--rate-limit",
    env: "CONNPASS_RATE_LIMIT_ENABLED",
    description: "Enable API rate limiting",
    group: "Connpass Configuration",
    type: "boolean",
    default: true,
  },
  rateLimitDelayMs: {
    cli: "--rate-limit-delay",
    env: "CONNPASS_RATE_LIMIT_DELAY_MS",
    description: "Rate limit delay in milliseconds",
    group: "Connpass Configuration",
    type: "number",
    default: 1000,
    valueName: "<ms>",
  },
};

export const allConfigDefs: ConfigDefs = {
  ...connpassConfigDefs,
  ...baseConfigDefs,
};

export interface ServerConfig extends BaseServerConfig {
  connpassApiKey?: string;
  defaultUserId?: number;
  rateLimitEnabled: boolean;
  rateLimitDelayMs: number;
}

function createDefaultConfig(): ServerConfig {
  const schemaDefs = getDefaultsFromDefs(allConfigDefs) as Record<
    string,
    unknown
  >;
  return schemaDefs as unknown as ServerConfig;
}

export function getConfig(
  argv?: string[],
  env?: NodeJS.ProcessEnv,
): ServerConfig {
  const cliConfig = parseCliFromDefs(
    allConfigDefs,
    argv ?? process.argv.slice(2),
  ) as Partial<ServerConfig>;
  const envConfig = parseEnvFromDefs(
    allConfigDefs,
    env ?? process.env,
  ) as Partial<ServerConfig>;

  const defaultConfig = createDefaultConfig();
  const merged: ServerConfig = {
    ...defaultConfig,
    ...filterUndefined(envConfig),
    ...filterUndefined(cliConfig),
  };

  return merged;
}

export function getHelpText(): string {
  return generateHelp(allConfigDefs, {
    usage: "connpass-mcp-apps [options]",
    examples: [
      "CONNPASS_API_KEY=xxx connpass-mcp-apps",
      "connpass-mcp-apps --http --port 8080",
      "connpass-mcp-apps --connpass-api-key xxx --default-user-id 12345",
    ],
  });
}

let cachedConfig: ServerConfig | null = null;

export function getCachedConfig(): ServerConfig {
  if (!cachedConfig) {
    cachedConfig = getConfig();
  }
  return cachedConfig;
}

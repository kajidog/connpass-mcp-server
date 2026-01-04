export interface OAuthConfig {
  enabled: boolean;
  mcpServerUrl: string;
  authServerUrl: string;
  jwksUri: string;
  issuer?: string;
  scopesSupported: string[];
  resourceName: string;
}

export function getOAuthConfig(): OAuthConfig | null {
  if (process.env.MCP_OAUTH_ENABLED !== "true") return null;

  return {
    enabled: true,
    mcpServerUrl: process.env.MCP_SERVER_URL || "http://localhost:3000",
    authServerUrl: process.env.MCP_AUTH_SERVER_URL || "http://localhost:3001",
    jwksUri:
      process.env.MCP_JWKS_URI || "http://localhost:3001/.well-known/jwks.json",
    issuer: process.env.MCP_ISSUER,
    scopesSupported: (
      process.env.MCP_OAUTH_SCOPES || "mcp:tools,mcp:resources"
    ).split(","),
    resourceName: process.env.MCP_RESOURCE_NAME || "Connpass MCP Server",
  };
}

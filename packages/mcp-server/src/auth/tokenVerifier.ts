import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt?: number;
}

export async function verifyAccessToken(
  token: string,
  jwksUri: string,
  issuer?: string,
): Promise<AuthInfo> {
  const JWKS = createRemoteJWKSet(new URL(jwksUri));

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer,
    });

    return {
      token,
      clientId:
        (payload.azp as string) || (payload.client_id as string) || "unknown",
      scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
      expiresAt: payload.exp,
    };
  } catch (error) {
    throw new Error(
      `Token verification failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// src/lib/cloudflare-access.ts
import { jwtVerify, createRemoteJWKSet } from 'jose';

interface AccessJWTPayload {
  email: string;
  sub: string;
  name?: string;
  aud: string[];
  iss: string;
  iat: number;
  exp: number;
}

export interface ValidatedUser {
  email: string;
  sub: string;
  name?: string;
  isValid: boolean;
}

/**
 * Valida el JWT de Cloudflare Access
 */
export async function validateCloudflareAccessJWT(
  token: string,
  teamDomain: string,
  policyAud: string
): Promise<ValidatedUser | null> {
  try {
    // URL de las claves públicas de Cloudflare Access
    const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
    const JWKS = createRemoteJWKSet(new URL(certsUrl));

    // Verificar el JWT
    const { payload } = await jwtVerify(token, JWKS, {
      audience: policyAud,
      issuer: `https://${teamDomain}`,
    }) as { payload: AccessJWTPayload };

    console.log('✓ JWT válido para:', payload.email);

    return {
      email: payload.email,
      sub: payload.sub,
      name: payload.name,
      isValid: true,
    };
  } catch (error) {
    console.error('✗ JWT validation failed:', error);
    return null;
  }
}

/**
 * Extrae el JWT de la request
 */
export function extractAccessToken(request: Request): string | null {
  // Cloudflare Access envía el JWT en este header
  const headerToken = request.headers.get('Cf-Access-Jwt-Assertion');
  if (headerToken) {
    return headerToken;
  }

  // También puede estar en cookies
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/CF_Authorization=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}
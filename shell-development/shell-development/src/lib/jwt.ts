/**
 * Decodes a JWT payload (no signature verification — the backend already
 * validates; the shell only reads display claims like name/email/role).
 */
export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  role?: string;
  type?: string;
  exp?: number;
  [key: string]: unknown;
}

export function parseJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

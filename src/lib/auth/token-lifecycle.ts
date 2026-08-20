import "server-only";

import { createHash } from "crypto";
import type { JWT } from "next-auth/jwt";
import { rotateBackendSession } from "./backend-auth-client";

const CLOCK_SKEW_SECONDS = 30;
const refreshes = new Map<
  string,
  Promise<Awaited<ReturnType<typeof rotateBackendSession>>>
>();
export type PublicAuthError = "SessionExpired";

function refreshKey(refreshToken: string) {
  return createHash("sha256").update(refreshToken).digest("hex");
}

export function terminalBackendSession(
  token: JWT,
  error: PublicAuthError = "SessionExpired"
): JWT {
  const terminal = { ...token };
  delete terminal.backendAccess;
  delete terminal.backendAccessExpiresAt;
  delete terminal.backendRefresh;
  delete terminal.backendRefreshExpiresAt;
  delete terminal.access;
  delete terminal.accessExpiresIn;
  delete terminal.refresh;
  delete terminal.refreshExpiresIn;
  terminal.authError = error;
  return terminal;
}

async function deduplicatedRefresh(refreshToken: string) {
  const key = refreshKey(refreshToken);
  const existing = refreshes.get(key);
  if (existing) return existing;
  const pending = rotateBackendSession(refreshToken).finally(() =>
    refreshes.delete(key)
  );
  refreshes.set(key, pending);
  return pending;
}

export async function refreshBackendSession(
  token: JWT,
  now = Date.now()
): Promise<JWT> {
  if (
    token.backendAccess &&
    token.backendAccessExpiresAt &&
    now < (token.backendAccessExpiresAt - CLOCK_SKEW_SECONDS) * 1000
  )
    return token;
  if (
    !token.backendRefresh ||
    !token.backendRefreshExpiresAt ||
    now >= token.backendRefreshExpiresAt * 1000
  )
    return terminalBackendSession(token);
  try {
    const rotated = await deduplicatedRefresh(token.backendRefresh);
    return {
      ...token,
      backendAccess: rotated.access,
      backendAccessExpiresAt: rotated.accessExpiresAt,
      backendRefresh: rotated.refresh,
      backendRefreshExpiresAt: rotated.refreshExpiresAt,
      authError: undefined,
    };
  } catch {
    return terminalBackendSession(token);
  }
}

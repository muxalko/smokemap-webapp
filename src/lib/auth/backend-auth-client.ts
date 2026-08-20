import "server-only";

const graphqlEndpoint =
  process.env.GRAPHQL_INTERNAL_ENDPOINT ??
  `${process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"}/graphql/`;

const LOGIN = `mutation Login($email: String!, $password: String!) { tokenAuth(email: $email, password: $password) { payload token refreshExpiresIn refreshToken user { name email role image } } }`;
const REFRESH = `mutation Refresh($refreshToken: String) { refreshToken(refreshToken: $refreshToken) { payload token refreshExpiresIn refreshToken } }`;
const REVOKE = `mutation Revoke($refreshToken: String) { revokeToken(refreshToken: $refreshToken) { revoked } }`;

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ extensions?: { code?: string } }>;
};

export class BackendAuthError extends Error {
  constructor(public readonly code: string) {
    super("Backend authentication request failed");
    this.name = "BackendAuthError";
  }
}

async function request<T>(
  query: string,
  variables: Record<string, string>,
  retries = 1
): Promise<T> {
  try {
    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    if (response.status >= 500) throw new Error("Backend provider unavailable");
    const result = (await response.json()) as GraphQLResponse<T>;
    if (!response.ok || result.errors?.length || !result.data) {
      throw new BackendAuthError(
        result.errors?.[0]?.extensions?.code ?? "INVALID_AUTH_RESPONSE"
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof BackendAuthError || retries === 0) throw error;
    return request<T>(query, variables, retries - 1);
  }
}

export type BackendCredentials = {
  access: string;
  accessExpiresAt: number;
  refresh: string;
  refreshExpiresAt: number;
};
type TokenPayload = {
  payload: { exp?: number; sub?: string };
  token: string;
  refreshExpiresIn: number;
  refreshToken: string;
};

function credentials(
  payload: TokenPayload | null | undefined
): BackendCredentials {
  if (
    !payload?.token ||
    !payload.refreshToken ||
    !Number.isFinite(payload.payload?.exp) ||
    !Number.isFinite(payload.refreshExpiresIn)
  ) {
    throw new BackendAuthError("INVALID_AUTH_RESPONSE");
  }
  return {
    access: payload.token,
    accessExpiresAt: payload.payload.exp as number,
    refresh: payload.refreshToken,
    refreshExpiresAt: payload.refreshExpiresIn,
  };
}

export async function loginWithPassword(email: string, password: string) {
  const data = await request<{
    tokenAuth?: TokenPayload & {
      user?: { name?: string; email?: string; role?: string; image?: string };
    };
  }>(LOGIN, { email, password }, 0);
  const tokenAuth = data.tokenAuth;
  if (!tokenAuth?.user || !tokenAuth.payload.sub)
    throw new BackendAuthError("INVALID_AUTH_RESPONSE");
  const issued = credentials(tokenAuth);
  return {
    ...tokenAuth.user,
    id: tokenAuth.payload.sub,
    role: tokenAuth.user.role ?? "user",
    backendAccess: issued.access,
    backendAccessExpiresAt: issued.accessExpiresAt,
    backendRefresh: issued.refresh,
    backendRefreshExpiresAt: issued.refreshExpiresAt,
  };
}

export async function rotateBackendSession(refreshToken: string) {
  const data = await request<{ refreshToken?: TokenPayload }>(REFRESH, {
    refreshToken,
  });
  return credentials(data.refreshToken);
}

export async function revokeBackendSession(refreshToken: string) {
  await request<{ revokeToken?: { revoked: number } }>(
    REVOKE,
    { refreshToken },
    0
  );
}

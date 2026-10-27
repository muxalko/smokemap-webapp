/** @jest-environment node */

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("next/headers", () => ({ cookies: jest.fn(), headers: jest.fn() }));
jest.mock("@/lib/logger", () => ({ info: jest.fn(), warn: jest.fn() }));
jest.mock("@/lib/auth/backend-auth-client", () => ({
  loginWithPassword: jest.fn(),
  revokeBackendSession: jest.fn(),
}));

import { cookies, headers } from "next/headers";
import { encode } from "next-auth/jwt";
import { NextRequest, type NextFetchEvent } from "next/server";

import { revokeBackendSession } from "@/lib/auth/backend-auth-client";
import middleware from "@/middleware";
import { GET, POST } from "./route";

const secret = "test-only-logout-nextauth-secret-32-chars";
const cookieName = "next-auth.session-token";
const jar = new Map<string, string>();
type Handler = (
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) => Promise<Response>;
const get = GET as Handler;
const post = POST as Handler;

async function authRequest(action: string, body?: Record<string, string>) {
  jest.mocked(cookies).mockResolvedValue({
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  } as Awaited<ReturnType<typeof cookies>>);
  const request = new NextRequest(`http://localhost:3000/api/auth/${action}`, {
    method: body ? "POST" : "GET",
    ...(body
      ? {
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(body),
        }
      : {}),
  });
  const response = await (body ? post : get)(request, {
    params: Promise.resolve({ nextauth: [action] }),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    if (!value || /max-age=0/i.test(cookie)) jar.delete(name);
    else jar.set(name, decodeURIComponent(value));
  }
  return response;
}

function protectedRequest() {
  return middleware(
    new NextRequest("http://localhost:3000/requests", {
      headers: {
        cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; "),
      },
    }),
    {} as NextFetchEvent
  );
}

const originalUrl = process.env.NEXTAUTH_URL;
const originalSecret = process.env.NEXTAUTH_SECRET;

beforeEach(async () => {
  jest.clearAllMocks();
  jar.clear();
  process.env.NEXTAUTH_URL = "http://localhost:3000";
  process.env.NEXTAUTH_SECRET = secret;
  jest
    .mocked(headers)
    .mockResolvedValue(new Headers({ host: "localhost:3000" }));
  jest.mocked(revokeBackendSession).mockResolvedValue(undefined);
  jar.set(
    cookieName,
    await encode({
      secret,
      token: {
        sub: "7",
        backendUserId: "7",
        name: "Moderator",
        role: "moderator",
        backendAccess: "test-only-access",
        backendAccessExpiresAt: Date.now() / 1000 + 300,
        backendRefresh: "test-only-refresh",
        backendRefreshExpiresAt: Date.now() / 1000 + 3600,
      },
    })
  );
});

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = originalSecret;
});

it.each([false, true])(
  "clears the real NextAuth session and denies protected access after logout (revocation offline: %s)",
  async (offline) => {
    if (offline) {
      jest
        .mocked(revokeBackendSession)
        .mockRejectedValueOnce(new Error("offline"));
    }
    expect(await protectedRequest()).toBeUndefined();
    const before: unknown = await (await authRequest("session")).json();
    expect(before).toMatchObject({ user: { id: "7", role: "moderator" } });
    expect(JSON.stringify(before)).not.toMatch(/test-only-(access|refresh)/);

    const { csrfToken } = (await (await authRequest("csrf")).json()) as {
      csrfToken: string;
    };
    const response = await authRequest("signout", {
      csrfToken,
      callbackUrl: "/",
      json: "true",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "http://localhost:3000/",
    });
    expect(revokeBackendSession).toHaveBeenCalledTimes(1);
    expect(revokeBackendSession).toHaveBeenCalledWith("test-only-refresh");
    expect(jar.has(cookieName)).toBe(false);
    await expect((await authRequest("session")).json()).resolves.toEqual({});
    const denied = await protectedRequest();
    expect(denied?.status).toBe(307);
    expect(denied?.headers.get("location")).toContain("/api/auth/signin");
  }
);

it("preserves the session and does not revoke it for a logout POST without CSRF", async () => {
  const response = await authRequest("signout", {
    callbackUrl: "/",
    json: "true",
  });
  await expect(response.json()).resolves.toEqual({
    url: "http://localhost:3000/api/auth/signout?csrf=true",
  });
  expect(jar.has(cookieName)).toBe(true);
  expect(revokeBackendSession).not.toHaveBeenCalled();
  expect(await protectedRequest()).toBeUndefined();
});

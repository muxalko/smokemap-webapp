/** @jest-environment node */

import fs from "node:fs";
import path from "node:path";
import { encode } from "next-auth/jwt";
import { NextRequest, type NextFetchEvent } from "next/server";

import edgeLogger from "@/lib/edge-logger";
import middleware from "./middleware";

const SECRET = "test-only-nextauth-secret-32-chars";
const SESSION_TOKEN = "probe-only-backend-access";

function localImports(file: string): string[] {
  const source = fs.readFileSync(file, "utf8");
  return [...source.matchAll(/from\s+["']((?:\.{1,2}|@)\/[^"']+)["']/g)].map(
    ([, specifier]) => {
      const base = specifier.startsWith("@/")
        ? path.join(__dirname, specifier.slice(2))
        : path.resolve(path.dirname(file), specifier);
      const resolved = ["", ".ts", ".tsx", ".js", "/index.ts"]
        .map((extension) => base + extension)
        .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (!resolved) throw new Error(`Unresolved middleware import ${specifier}`);
      return resolved;
    }
  );
}

function declaresUseClient(file: string): boolean {
  const source = fs
    .readFileSync(file, "utf8")
    .replace(/^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*)*/, "");
  return /^["']use client["']/.test(source);
}

async function authenticatedRequest(role?: string): Promise<NextRequest> {
  const headers = new Headers();
  if (role) {
    const token = await encode({
      secret: SECRET,
      token: { sub: "1", role, backendAccess: SESSION_TOKEN },
    });
    headers.set("cookie", `next-auth.session-token=${token}`);
  }
  return new NextRequest("http://localhost:3000/requests", { headers });
}

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = SECRET;
  delete process.env.NEXTAUTH_URL;
});

afterEach(() => {
  delete process.env.NEXTAUTH_SECRET;
  jest.restoreAllMocks();
});

it("imports only Edge-safe modules, never client components", () => {
  const visited = new Set<string>();
  const pending = [path.join(__dirname, "middleware.ts")];
  while (pending.length) {
    const file = pending.pop() as string;
    if (visited.has(file)) continue;
    visited.add(file);
    expect({ file, useClient: declaresUseClient(file) }).toEqual({
      file,
      useClient: false,
    });
    pending.push(...localImports(file));
  }
  expect(visited).toContain(path.join(__dirname, "lib/edge-logger.ts"));
});

it("lets an authenticated moderator reach /requests and logs only the path", async () => {
  const debug = jest.spyOn(edgeLogger, "debug").mockImplementation(() => {});

  const response = await middleware(
    await authenticatedRequest("moderator"),
    {} as NextFetchEvent
  );

  // No redirect or rewrite: Next.js continues to the requested page.
  expect(response).toBeUndefined();
  expect(debug).toHaveBeenCalledWith(
    { pathname: "/requests" },
    "withAuth middleware"
  );
  expect(JSON.stringify(debug.mock.calls)).not.toContain(SESSION_TOKEN);
});

it("rewrites an authenticated non-moderator to /denied", async () => {
  jest.spyOn(edgeLogger, "debug").mockImplementation(() => {});

  const response = await middleware(
    await authenticatedRequest("user"),
    {} as NextFetchEvent
  );

  expect(response?.headers.get("x-middleware-rewrite")).toBe(
    "http://localhost:3000/denied"
  );
});

it("sends an anonymous visitor to sign in", async () => {
  const response = await middleware(
    await authenticatedRequest(),
    {} as NextFetchEvent
  );

  expect(response?.status).toBe(307);
  expect(response?.headers.get("location")).toContain("/api/auth/signin");
});

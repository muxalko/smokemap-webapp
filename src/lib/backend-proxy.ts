import "server-only";

import { validateBackendConnectivity } from "@/lib/production-config";

const REQUEST_HEADERS_TO_REMOVE = [
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
];

const RESPONSE_HEADERS_TO_REMOVE = [
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
];

export function smokemapBackendPath(path: string[]): string | null {
  const joined = path.join("/");
  const routes: Record<string, string> = {
    graphql: "/graphql/",
    locations: "/api/v1/places/",
    "places/search": "/api/v1/places/search/",
  };
  return routes[joined] ?? null;
}

export function mediaBackendPath(path: string[], trailingSlash: boolean) {
  if (path.length === 0 || path.some((segment) => segment.length === 0)) {
    return null;
  }
  const encodedPath = path.map(encodeURIComponent).join("/");
  return `/api/v1/media/${encodedPath}${trailingSlash ? "/" : ""}`;
}

export async function proxyBackendRequest(
  request: Request,
  backendPath: string
): Promise<Response> {
  const { backendOrigin } = validateBackendConnectivity(process.env);
  const incomingUrl = new URL(request.url);
  const target = new URL(backendPath, `${backendOrigin}/`);
  target.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  for (const name of REQUEST_HEADERS_TO_REMOVE) headers.delete(name);
  headers.set("x-forwarded-proto", "https");

  const method = request.method.toUpperCase();
  const response = await fetch(target, {
    method,
    headers,
    body:
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  for (const name of RESPONSE_HEADERS_TO_REMOVE) responseHeaders.delete(name);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

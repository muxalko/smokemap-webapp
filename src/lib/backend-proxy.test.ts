/** @jest-environment node */

jest.mock("server-only", () => ({}), { virtual: true });

import {
  mediaBackendPath,
  proxyBackendRequest,
  smokemapBackendPath,
} from "./backend-proxy";

const originalFetch = global.fetch;

beforeEach(() => {
  process.env.BACKEND_INTERNAL_URL = "http://backend:8000";
  process.env.GRAPHQL_INTERNAL_ENDPOINT = "http://backend:8000/graphql/";
});

afterEach(() => {
  delete process.env.BACKEND_INTERNAL_URL;
  delete process.env.GRAPHQL_INTERNAL_ENDPOINT;
  global.fetch = originalFetch;
});

it("maps only the established same-origin browser API routes", () => {
  expect(smokemapBackendPath(["graphql"])).toBe("/graphql/");
  expect(smokemapBackendPath(["locations"])).toBe("/api/v1/places/");
  expect(smokemapBackendPath(["places", "search"])).toBe(
    "/api/v1/places/search/"
  );
  expect(smokemapBackendPath(["admin"])).toBeNull();
});

it("preserves approved-media slash behavior without accepting empty paths", () => {
  expect(mediaBackendPath(["opaque id"], true)).toBe(
    "/api/v1/media/opaque%20id/"
  );
  expect(mediaBackendPath(["opaque"], false)).toBe("/api/v1/media/opaque");
  expect(mediaBackendPath([], true)).toBeNull();
});

it("forwards the browser's encoded viewport query unchanged", async () => {
  const upstream = jest.fn().mockResolvedValue(new Response("{}"));
  global.fetch = upstream;
  const request = new Request(
    "https://staging.smokemap.test/api/smokemap/locations?bbox=1%2C2%2C3%2C4&zoom=10"
  );

  await proxyBackendRequest(request, "/api/v1/places/");

  const [url] = upstream.mock.calls[0] as [URL];
  expect(url.href).toBe(
    "http://backend:8000/api/v1/places/?bbox=1%2C2%2C3%2C4&zoom=10"
  );
});

it("proxies method, query, and body through the runtime backend contract", async () => {
  const upstream = jest.fn().mockResolvedValue(
    new Response('{"data":{"ok":true}}', {
      status: 200,
      headers: { "content-type": "application/json", "content-length": "20" },
    })
  );
  global.fetch = upstream;
  const request = new Request(
    "https://staging.smokemap.test/api/smokemap/graphql?operation=test",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "attacker.invalid",
        "x-forwarded-proto": "http",
      },
      body: '{"query":"{__typename}"}',
    }
  );

  const response = await proxyBackendRequest(request, "/graphql/");
  expect(response.status).toBe(200);
  expect(response.headers.has("content-length")).toBe(false);

  const [url, init] = upstream.mock.calls[0] as [URL, RequestInit];
  expect(url.href).toBe("http://backend:8000/graphql/?operation=test");
  expect(init.method).toBe("POST");
  expect(new Headers(init.headers).get("host")).toBeNull();
  expect(new Headers(init.headers).get("x-forwarded-proto")).toBe("https");
  expect(Buffer.from(init.body as ArrayBuffer).toString()).toBe(
    '{"query":"{__typename}"}'
  );
});

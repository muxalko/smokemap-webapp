/** @jest-environment node */

const nextConfig = require("./next.config");

it("routes opaque relative backend media URLs to the backend", async () => {
  await expect(nextConfig.rewrites()).resolves.toContainEqual({
    source: "/api/v1/media/:path*",
    destination: "http://localhost:8000/api/v1/media/:path*",
  });
});

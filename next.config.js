/** @type {import('next').NextConfig} */

const backendInternalUrl = (
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/smokemap/graphql",
        destination: `${backendInternalUrl}/graphql/`,
      },
      {
        source: "/api/smokemap/locations",
        destination: `${backendInternalUrl}/locations/`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/u/**",
      },
      {
        protocol: "https",
        hostname: "smokemap-static-images-staging.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "smokemap-static-images-production.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    serverActions: true,
    serverComponentsExternalPackages: ['pino'],
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false
  },
  reactStrictMode: false
};

module.exports = nextConfig

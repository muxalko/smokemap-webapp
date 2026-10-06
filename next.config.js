/** @type {import('next').NextConfig} */

const backendInternalUrl = (
  process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

const nextConfig = {
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: "/:path((?!api/v1/media/).+)/",
        destination: "/:path",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/smokemap/graphql",
        destination: `${backendInternalUrl}/graphql/`,
      },
      {
        source: "/api/smokemap/locations",
        destination: `${backendInternalUrl}/api/v1/places/`,
      },
      {
        source: "/api/smokemap/places/search",
        destination: `${backendInternalUrl}/api/v1/places/search/`,
      },
      {
        source: "/api/v1/media/:publicId/",
        destination: `${backendInternalUrl}/api/v1/media/:publicId/`,
      },
      {
        source: "/api/v1/media/:path*",
        destination: `${backendInternalUrl}/api/v1/media/:path*`,
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
  reactStrictMode: true
};

module.exports = nextConfig

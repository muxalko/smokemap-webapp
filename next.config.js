/** @type {import('next').NextConfig} */

const nextConfig = {
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

    ],
  },
  experimental: {
    serverActions: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false
  }
};

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,

  // Configure ESLint to ignore during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  async redirects() {
    return [
      { source: '/reports', destination: '/event-reports', permanent: true },
      { source: '/finance-report', destination: '/finance-reports', permanent: true },
    ];
  },
};

module.exports = nextConfig;
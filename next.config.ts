/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode
  reactStrictMode: true,
  
  // Configure ESLint to ignore during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
}

module.exports = nextConfig
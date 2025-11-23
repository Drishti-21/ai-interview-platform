/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel deployment optimizations
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdf-lib', 'formidable']
  },
  // Enable ES modules support
  transpilePackages: [],
};

export default nextConfig;

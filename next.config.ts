import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for optimized Vercel deployment
  output: 'standalone',
  
  // Image optimization for Vercel
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  
  // Enable React strict mode for better debugging
  reactStrictMode: true,
  
  // Optimize package imports for smaller bundle size
  experimental: {
    optimizePackageImports: ['@react-three/fiber', '@react-three/drei', 'three'],
  },
};

export default nextConfig;

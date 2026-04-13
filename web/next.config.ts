import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // experimental: {}, // Remover se não tiver uso
  allowedDevOrigins: ['192.168.100.55', 'localhost'],
};

export default nextConfig;

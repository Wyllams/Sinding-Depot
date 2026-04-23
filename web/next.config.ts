import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.55', 'localhost'],
  serverExternalPackages: ['nodemailer'],
};

export default nextConfig;

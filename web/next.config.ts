import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.100.55', 'localhost'],
  serverExternalPackages: ['nodemailer'],
};

export default withNextIntl(nextConfig);

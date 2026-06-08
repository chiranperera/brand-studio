import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This project is the workspace root (avoids picking up a parent lockfile).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;

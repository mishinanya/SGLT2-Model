import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  transpilePackages: ["@web-template/shared"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

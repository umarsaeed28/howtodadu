import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Explore deals and the Product page were removed. Keep old links working.
    return [
      { source: "/app", destination: "/", permanent: true },
      { source: "/app/:path*", destination: "/", permanent: true },
      { source: "/product", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;

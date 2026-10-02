import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Data files read with fs at runtime: make sure they ship with the server functions.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/lot-library.json", "./data/alleys.geojson", "./data/test-data/listings.fixture.json"],
    "/listing/**/*": ["./data/lot-library.json", "./data/test-data/listings.fixture.json"],
    // The knowledge base the AI review searches (rag-lexical.ts reads it at runtime).
    "/api/assessment": ["./rag/documents/**/*.md"],
  },
  // The Python side of rag/ (virtualenv, vector store) is local-only and must never be bundled.
  outputFileTracingExcludes: {
    "/**/*": ["./rag/.venv/**", "./rag/storage/**", "./rag/**/__pycache__/**", "./services/**", "./fde/**"],
  },
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

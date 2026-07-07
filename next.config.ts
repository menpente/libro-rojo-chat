import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lib/book.ts reads data/libro-rojo.md via a computed fs path, which the
  // automatic file tracer can miss — include it explicitly so Vercel bundles
  // it with the /api/chat serverless function.
  outputFileTracingIncludes: {
    "/api/chat": ["./data/**/*"],
  },
};

export default nextConfig;

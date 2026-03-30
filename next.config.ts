import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle the SQLite file into the serverless output so it's available
  // at runtime on Vercel (downloaded by scripts/fetch-db.js during prebuild).
  outputFileTracingIncludes: {
    "/**": ["./fcn_master_lexicon_phase8_6_primer.sqlite"],
  },
};

export default nextConfig;

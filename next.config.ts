import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Bundle the SQLite file into the serverless output so it's available
    // at runtime on Vercel (the file is downloaded by scripts/fetch-db.js
    // during prebuild from S3).
    outputFileTracingIncludes: {
      "/**": ["./fcn_master_lexicon_phase8_6_primer.sqlite"],
    },
  },
};

export default nextConfig;

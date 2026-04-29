import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mero-mero-app.s3.us-east-1.amazonaws.com",
        pathname: "/word-images/**",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "live.staticflickr.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.rawpixel.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.stocksnap.io",
        pathname: "/**",
      },
    ],
  },
  // Bundle the SQLite file into the serverless output so it's available
  // at runtime on Vercel (downloaded by scripts/fetch-db.js during prebuild).
  outputFileTracingIncludes: {
    "/**": ["./fcn_master_lexicon_phase8_6_primer.sqlite"],
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Suppress lockfile root warning in Korean/non-ASCII paths
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;

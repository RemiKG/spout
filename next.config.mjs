/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output makes the Docker image (Alibaba ECS/SAS) tiny + self-contained.
  output: "standalone",
  reactStrictMode: true,
  // pdfjs-dist ships a worker we load from /public; keep it external from the server bundle.
  serverExternalPackages: ["pdfjs-dist", "googleapis"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

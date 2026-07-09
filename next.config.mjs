/** @type {import('next').NextConfig} */
// Vercel builds through its own Build Output API; `output: "standalone"` is only
// for the self-contained Docker image (Alibaba ECS/SAS) and can leave App Router
// routes unmapped on Vercel (platform 404). So enable standalone everywhere EXCEPT
// on Vercel, which sets process.env.VERCEL at build time.
const onVercel = !!process.env.VERCEL;
const nextConfig = {
  // Standalone output makes the Docker image (Alibaba ECS/SAS) tiny + self-contained.
  ...(onVercel ? {} : { output: "standalone" }),
  reactStrictMode: true,
  // pdfjs-dist ships a worker we load from /public; keep it external from the server bundle.
  serverExternalPackages: ["pdfjs-dist", "googleapis"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;

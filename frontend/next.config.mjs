/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mobile-first: optimize images + experimental features
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Strict mode catches subtle bugs early
  reactStrictMode: true,
};

export default nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Permitir mostrar imágenes y miniaturas servidas desde Vercel Blob.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

module.exports = nextConfig;

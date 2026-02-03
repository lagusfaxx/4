/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/feed", destination: "/inicio", permanent: true },
      { source: "/videos", destination: "/reels", permanent: true },
      { source: "/services", destination: "/servicios", permanent: true },
      { source: "/profile/:path*", destination: "/perfil/:path*", permanent: true }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`
      }
    ];
  }
};

export default nextConfig;

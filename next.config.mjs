/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true, // Compression Brotli / Gzip automatique
  poweredByHeader: false, // Réduit la taille des en-têtes HTTP
  typescript: {
    // La validation stricte des types Next.js est assurée par tsconfig.next.json
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Technique secrète 1 : Tree-shaking granulaire automatique des gros packages
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
    ],
  },
  serverExternalPackages: ['archiver', '@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'firebase-admin'],
};

export default nextConfig;

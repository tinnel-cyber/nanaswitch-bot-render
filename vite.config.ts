import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    define: {
      'process.env.LAMBDA_URL': JSON.stringify(process.env.LAMBDA_URL || process.env.AWS_LAMBDA_URL || process.env.VITE_AWS_LAMBDA_URL || ''),
      'process.env.AWS_LAMBDA_URL': JSON.stringify(process.env.AWS_LAMBDA_URL || process.env.LAMBDA_URL || process.env.VITE_AWS_LAMBDA_URL || ''),
      'process.env.VITE_PAYMENT_API_URL': JSON.stringify(process.env.VITE_PAYMENT_API_URL || 'https://nana-payment-api.onrender.com'),
      'process.env.AWS_REGION': JSON.stringify(process.env.AWS_REGION || process.env.VITE_AWS_REGION || 'eu-west-3'),
      'process.env.AWS_BUCKET_NAME': JSON.stringify(process.env.AWS_BUCKET_NAME || process.env.VITE_AWS_BUCKET_NAME || 'nsore-video-storage'),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'lucide-react'],
      // mediabunny est chargé dans un Web Worker module : ne pas le pré-bundler pour le thread principal
      exclude: ['mediabunny'],
    },
    worker: {
      format: 'es',
    },
    server: {
      // Autorise les domaines officiels (nsore.shop, nanasore.com) et les domaines personnalisés clients
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/scratch/**']
      },
      proxy: {
        '/aws-lambda': {
          target: 'https://lvl7sz2hihrrp6jdui35hm7qnq0zxbkl.lambda-url.eu-north-1.on.aws',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/aws-lambda/, ''),
        },
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        '/api/payment': {
          target: 'https://nana-payment-api.onrender.com',
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      target: 'esnext',
      sourcemap: false, // 🔒 Désactive la génération des Source Maps en production
      minify: 'esbuild', // 🔒 Minification native ultra-rapide et stable à 100%
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@xenova') || id.includes('onnxruntime-web')) {
              return 'transformers-onnx';
            }
            if (id.includes('node_modules/@ffmpeg')) {
              return 'ffmpeg-wasm';
            }
            if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
              return 'pdf-suite';
            }
            if (id.includes('node_modules/firebase')) {
              return 'firebase-vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'lucide-icons';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-core';
            }
          },
        },
      },
    },
  };
});

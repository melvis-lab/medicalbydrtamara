import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        short_name: "MediBuilder",
        name: "MediBuilder AI Medical Training",
        description: "Voice-to-Training generator for medical education.",
        icons: [
          {
            src: "pwa-192x192.png",
            type: "image/png",
            sizes: "192x192"
          },
          {
            src: "pwa-512x512.png",
            type: "image/png",
            sizes: "512x512"
          }
        ],
        start_url: ".",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#f9fafb",
        orientation: "portrait"
      }
    })
  ]
});
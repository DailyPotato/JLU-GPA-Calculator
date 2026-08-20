import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/JLU-GPA-Calculator/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'app-icon.svg'],
      manifest: {
        name: '吉林大学本科生绩点计算器',
        short_name: 'JLU GPA',
        description: '成绩仅在浏览器本地处理的绩点与均分计算器。',
        theme_color: '#8f2c3e',
        background_color: '#f5f6f7',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      }
    })
  ]
}));

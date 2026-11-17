import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS en la red local: el navegador del Quest solo habilita WebXR en páginas seguras.
// Abrir en el Quest: https://<IP-de-la-PC>:5173
export default defineConfig({
  base: './',
  plugins: [basicSsl()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});

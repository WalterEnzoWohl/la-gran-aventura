import { defineConfig, type Plugin } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const raiz = import.meta.dirname;

/** Lista recursiva de archivos de una carpeta, con rutas relativas y barras normales. */
function listar(carpeta: string): string[] {
  const out: string[] = [];
  for (const nombre of readdirSync(carpeta)) {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) out.push(...listar(ruta));
    else out.push(relative(join(raiz, 'public'), ruta).replace(/\\/g, '/'));
  }
  return out;
}

/**
 * Genera sw.js en el build con la lista de archivos a guardar en caché (modo sin internet).
 * La versión cambia cuando cambia cualquier archivo, así los visores se actualizan solos.
 */
function serviceWorker(): Plugin {
  return {
    name: 'lga-service-worker',
    apply: 'build',
    // Al final, para que las páginas HTML ya estén en el bundle.
    enforce: 'post',
    generateBundle(_opciones, bundle) {
      const publicos = listar(join(raiz, 'public')).sort();
      const archivos = ['./', ...Object.keys(bundle), ...publicos].map((f) => (f === './' ? f : './' + f));
      const hash = createHash('sha256');
      for (const f of Object.keys(bundle)) hash.update(f);
      for (const f of publicos) hash.update(f).update(readFileSync(join(raiz, 'public', f)));
      const codigo = readFileSync(join(raiz, 'sw-plantilla.js'), 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__ARCHIVOS__', JSON.stringify([...new Set(archivos)], null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: codigo });
    },
  };
}

// HTTPS en la red local: el navegador del Quest solo habilita WebXR en páginas seguras.
// Abrir en el Quest: https://<IP-de-la-PC>:5173
export default defineConfig({
  base: './',
  plugins: [basicSsl(), serviceWorker()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        main: resolve(raiz, 'index.html'),
        admin: resolve(raiz, 'admin.html'),
      },
    },
  },
});

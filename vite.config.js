import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Plugin ligero que inyecta en dist/sw.js las rutas generadas por Vite (JS/CSS con hash)
 * para garantizar que el App Shell completo quede precacheado tras la instalación del SW.
 */
function pwaPrecacheAssetsPlugin() {
  return {
    name: 'pwa-precache-assets',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir || path.resolve(process.cwd(), 'dist');
      const swPath = path.join(outDir, 'sw.js');
      if (!fs.existsSync(swPath)) return;

      const assetUrls = Object.keys(bundle)
        .filter((fileName) => /\.(js|css|svg|png|woff2?)$/i.test(fileName))
        .map((fileName) => `/${fileName.replace(/\\/g, '/')}`);

      const markerRegex =
        /\/\*\s*__BUILD_ASSETS_START__\s*\*\/[\s\S]*?\/\*\s*__BUILD_ASSETS_END__\s*\*\//;
      const original = fs.readFileSync(swPath, 'utf8');
      const updated = original.replace(
        markerRegex,
        `/* __BUILD_ASSETS_START__ */ ${JSON.stringify(assetUrls)} /* __BUILD_ASSETS_END__ */`
      );
      fs.writeFileSync(swPath, updated, 'utf8');
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:3000';

  const proxyConfig = {
    '/api': {
      target: apiTarget,
      changeOrigin: true
    }
  };

  return {
    plugins: [vue(), tailwindcss(), pwaPrecacheAssetsPlugin()],
    server: {
      port: 5173,
      proxy: proxyConfig
    },
    preview: {
      port: 4173,
      proxy: proxyConfig
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.js']
    }
  };
});

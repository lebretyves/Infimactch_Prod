import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxy = {
    '/api': {
      target: env.API_PROXY_TARGET || 'http://127.0.0.1:3100',
      changeOrigin: false,
    },
  };
  return {
    publicDir: false,
    plugins: [react(), {
      name: 'admin-index',
      enforce: 'post',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url?.startsWith('/?')) req.url = '/admin.html';
          next();
        });
      },
      generateBundle(_, bundle) {
        const entry = bundle['admin.html'];
        if (entry) { delete bundle['admin.html']; entry.fileName = 'index.html'; bundle['index.html'] = entry; }
        this.emitFile({ type: 'asset', fileName: 'vercel.json', source: readFileSync('admin.vercel.json', 'utf8') });
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nDisallow: /\n' });
      },
      closeBundle() {
        if (existsSync('public/fonts')) {
          mkdirSync('dist-admin/fonts', { recursive: true });
          cpSync('public/fonts', 'dist-admin/fonts', { recursive: true });
        }
      },
    }],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '127.0.0.1',
      port: 5175,
      strictPort: true,
      proxy: apiProxy,
    },
    preview: {
      host: '127.0.0.1',
      port: 5175,
      strictPort: true,
      proxy: apiProxy,
    },
    build: { outDir: 'dist-admin', target: 'es2022', rollupOptions: { input: 'admin.html' } },
  };
});

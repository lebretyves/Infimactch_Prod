import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
export default defineConfig({
  publicDir: false,
  plugins: [react(), { name: 'admin-index', enforce: 'post', generateBundle(_, bundle) {
    const entry = bundle['admin.html'];
    if (entry) { delete bundle['admin.html']; entry.fileName = 'index.html'; bundle['index.html'] = entry; }
    this.emitFile({type:'asset',fileName:'vercel.json',source:readFileSync('admin.vercel.json','utf8')});
    this.emitFile({ type: 'asset', fileName: 'robots.txt', source: 'User-agent: *\nDisallow: /\n' });
  }, closeBundle() {
    if (existsSync('public/fonts')) { mkdirSync('dist-admin/fonts', { recursive: true }); cpSync('public/fonts', 'dist-admin/fonts', { recursive: true }); }
  }}],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { outDir: 'dist-admin', target: 'es2022', rollupOptions: { input: 'admin.html' } },
});

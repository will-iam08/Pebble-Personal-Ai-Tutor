import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-chrome-extension-files',
      apply: 'build',
      closeBundle(error?: Error): void {
        if (error) return;
        const rootDir = import.meta.dirname;
        const srcExtDir = path.resolve(rootDir, 'chrome-extension');
        const outDir = path.resolve(rootDir, 'dist-extension');
        fs.mkdirSync(outDir, { recursive: true });

        for (const file of ['manifest.json', 'background.js', 'content.js']) {
          const from = path.join(srcExtDir, file);
          const to = path.join(outDir, file);
          if (fs.existsSync(from)) {
            fs.copyFileSync(from, to);
          }
        }

        const srcIconsDir = path.join(srcExtDir, 'icons');
        const outIconsDir = path.join(outDir, 'icons');
        if (fs.existsSync(srcIconsDir)) {
          fs.cpSync(srcIconsDir, outIconsDir, { recursive: true, force: true });
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.'),
    },
  },
  build: {
    outDir: 'dist-extension',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        sidepanel: path.resolve(import.meta.dirname, 'sidepanel.html'),
      },
    },
  },
});

import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standard configuration for Mnemosyne OS Cartridges
export default defineConfig({
  plugins: [react()],
  base: './', // Vital for custom protocols (mnemo-plugin://)
  server: {
    host: '127.0.0.1', // Forces IPv4 loopback binding for Electron compatibility
    port: 5216,        // Also declared in mnemo-plugin.json for dev-linking
    strictPort: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  // Vitest reads this straight from the Vite config so the cartridge needs no
  // `vitest/config` import it cannot resolve on its own. jsdom because the
  // honest-degradation paths ARE the product here: what a tile shows for a
  // device that is not answering, and what the panel says on a host too old to
  // watch, are worth a rendered assertion rather than a promise.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}']
  }
} as UserConfig & { test: Record<string, unknown> });

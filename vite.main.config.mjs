import { defineConfig } from 'vite';

// Main process bundle. Electron and Node builtins are externalized by the
// plugin by default. drivelist (native addon) and axios must also stay
// external so they resolve from node_modules at runtime.
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['drivelist', 'axios'],
    },
  },
});

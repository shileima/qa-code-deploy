import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RenderMonitorSDK',
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') {
          return 'index.esm.js';
        }
        return 'index.js';
      }
    },
    rollupOptions: {
      output: {
        globals: {
          'window': 'window'
        }
      }
    },
    sourcemap: true
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*']
    })
  ]
});

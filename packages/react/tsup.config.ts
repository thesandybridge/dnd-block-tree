import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: false,
  treeshake: true,
  external: ['react', 'react-dom', '@dnd-kit/core', '@dnd-kit/utilities'],
})

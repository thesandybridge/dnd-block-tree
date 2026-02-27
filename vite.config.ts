import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeRaw from 'rehype-raw'
import rehypeShiki from '@shikijs/rehype'
import { shikiConfig } from './src/lib/shiki-config'
import path from 'path'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: './src/routes' }),
    mdx({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, rehypeRaw, [rehypeShiki, shikiConfig]],
    }),
    react({ include: /\.(tsx|ts|jsx|js|mdx|md)$/ }),
    svelte(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})

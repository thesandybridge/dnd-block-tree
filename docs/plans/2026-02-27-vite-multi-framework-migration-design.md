# Vite Multi-Framework SPA Migration Design

## Problem

The demo site needs to show Svelte demos alongside React and Vanilla demos. Next.js is React-only and can't render Svelte components. Need a multi-framework setup.

## Solution

Replace Next.js with a Vite SPA using `@vitejs/plugin-react` + `@sveltejs/vite-plugin-svelte` + TanStack Router. Svelte demo components mount into React wrapper components via `mount()`/`unmount()` targeting a ref'd div.

## Architecture

- **Vite** as build tool with dual framework plugins
- **TanStack Router** for client-side file-based routing
- **@mdx-js/rollup** for MDX docs (replaces next-mdx-remote/rsc)
- **Svelte 5** components via React wrappers using `useRef` + `useEffect` + Svelte `mount()`/`unmount()`
- **@thesandybridge/ui** stays for React page chrome (buttons, cards, dropdowns)
- Svelte demo pages use plain Tailwind to match the look

## Svelte Integration Pattern

```tsx
// React wrapper
function SvelteFileTree() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const component = mount(FileTreeDemo, { target: ref.current! })
    return () => unmount(component)
  }, [])
  return <div ref={ref} />
}
```

Each Svelte demo (FileTree, ProductivityTree, RealtimePane) gets:
1. A `.svelte` component using `@dnd-block-tree/svelte`
2. A React wrapper `.tsx` that mounts/unmounts it

## Routing

TanStack Router file-based routing:
- `/` — Landing page with framework toggle (React/Svelte/Vanilla)
- `/docs` — Docs index
- `/docs/$slug` — Dynamic doc pages (MDX)
- `/docs/changelog` — Changelog

## MDX

Replace `next-mdx-remote/rsc` with `@mdx-js/rollup`. Same plugin chain:
- remark-gfm
- rehype-slug, rehype-raw
- @shikijs/rehype (syntax highlighting)

MDX files in `content/docs/` imported as components at build time.

## Dependency Changes

### Add
- `vite`, `@vitejs/plugin-react`, `@sveltejs/vite-plugin-svelte`
- `svelte`, `@dnd-block-tree/svelte` (workspace)
- `@tanstack/react-router`, `@tanstack/router-plugin`
- `@mdx-js/rollup`

### Remove
- `next`, `next-mdx-remote`, `eslint-config-next`

## File Structure

```
src/
  routes/
    __root.tsx
    index.tsx
    docs/
      index.tsx
      $slug.tsx
      changelog.tsx
  components/
    (migrated from app/components/)
    svelte/
      SvelteFileTree.tsx          (React wrapper)
      SvelteProductivityTree.tsx
      SvelteRealtimePane.tsx
      FileTreeDemo.svelte         (Svelte component)
      ProductivityTreeDemo.svelte
      RealtimePaneDemo.svelte
  lib/
    (migrated from lib/)
content/
  docs/                           (unchanged MDX files)
index.html
vite.config.ts
```

## What Stays the Same

- All React demo components
- All Vanilla demo components
- @thesandybridge/ui for page chrome
- Tailwind CSS v4 + globals.css + theme system
- Shiki syntax highlighting
- MDX docs content (26 files)
- Doc sidebar navigation structure

## What Changes

| Next.js | Vite SPA |
|---------|----------|
| `next` | `vite` + framework plugins |
| `next-mdx-remote/rsc` | `@mdx-js/rollup` |
| App Router (`app/`) | TanStack Router (`src/routes/`) |
| `next/link`, `usePathname` | TanStack Router Link, useLocation |
| `next/font/local` | CSS `@font-face` |
| `generateStaticParams()` | Build-time MDX imports |
| `<Script>` (Umami) | `<script>` in index.html |
| Server-side changelog fetch | Client-side or build-time fetch |

## Migration Strategy

Incremental, in a worktree:
1. Scaffold Vite + TanStack Router + dual framework plugins
2. Migrate landing page with all demos (React, Vanilla, framework toggle)
3. Add Svelte demo components + wrappers, extend framework toggle
4. Migrate MDX docs system
5. Migrate page chrome (header, sidebar, footer, theme)
6. Clean up Next.js artifacts

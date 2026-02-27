# Vite Multi-Framework Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the demo/docs site from Next.js to a Vite SPA with React + Svelte + Vanilla demos, using TanStack Router for routing and @mdx-js/rollup for docs.

**Architecture:** Vite SPA with `@vitejs/plugin-react` + `@sveltejs/vite-plugin-svelte` for multi-framework support. TanStack Router for client-side routing. MDX docs processed at build time via `@mdx-js/rollup`. Svelte demos mount into React wrapper components via Svelte 5's `mount()`/`unmount()` API.

**Tech Stack:** Vite, React 18, Svelte 5, TanStack Router, @mdx-js/rollup, Tailwind CSS v4, @thesandybridge/ui

---

### Task 1: Scaffold Vite project with dual framework plugins

**Files:**
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Modify: `package.json` — swap dependencies
- Modify: `tsconfig.json` — update for Vite

**Step 1: Install new dependencies**

```bash
npm install @tanstack/react-router @tanstack/router-plugin
npm install -D vite @vitejs/plugin-react @sveltejs/vite-plugin-svelte svelte @mdx-js/rollup
```

**Step 2: Remove Next.js dependencies**

```bash
npm uninstall next next-mdx-remote eslint-config-next
```

**Step 3: Create `vite.config.ts`**

```ts
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
```

**Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="darkreader-lock" />
    <title>dnd-block-tree | Drag-and-Drop Block Trees</title>
    <meta name="description" content="A headless library for building hierarchical drag-and-drop interfaces" />
  </head>
  <body class="font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 5: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './globals.css'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
```

**Step 6: Create minimal `src/routes/__root.tsx`**

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => <Outlet />,
})
```

**Step 7: Create minimal `src/routes/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => <div>Hello from Vite + TanStack Router</div>,
})
```

**Step 8: Update `tsconfig.json`**

Replace the Next.js config with a Vite-compatible one:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "content", "vite.config.ts"],
  "exclude": ["node_modules"]
}
```

**Step 9: Update `package.json` scripts**

Replace Next.js scripts:
```json
"scripts": {
  "dev": "vite",
  "build": "turbo run build --filter='@dnd-block-tree/*' && vite build",
  "preview": "vite preview",
  ...
}
```

**Step 10: Move `app/globals.css` to `src/globals.css`**

Copy the file. Remove any Next.js-specific references.

**Step 11: Move fonts**

Move `app/fonts/` → `src/fonts/`. Add `@font-face` declarations to `src/globals.css`:

```css
@font-face {
  font-family: 'Geist Sans';
  src: url('./fonts/GeistVF.woff') format('woff');
  font-weight: 100 900;
  font-display: swap;
}
@font-face {
  font-family: 'Geist Mono';
  src: url('./fonts/GeistMonoVF.woff') format('woff');
  font-weight: 100 900;
  font-display: swap;
}
```

And add font-family to the `body` selector or a Tailwind `@theme` block.

**Step 12: Verify dev server starts**

Run: `npm run dev`
Expected: Vite dev server at localhost:5173 showing "Hello from Vite + TanStack Router"

**Step 13: Commit**

```bash
git add -A
git commit -m "build: scaffold Vite SPA with React + Svelte + TanStack Router"
```

---

### Task 2: Migrate root layout and theme system

**Files:**
- Modify: `src/routes/__root.tsx` — full layout with theme provider
- Move: `components/theme-provider.tsx` → `src/components/theme-provider.tsx`
- Move: `components/favicon.tsx` → `src/components/favicon.tsx`
- Modify: `index.html` — add theme initialization script

**Step 1: Move theme-provider.tsx and favicon.tsx**

Copy from `app/components/` (currently `components/`) to `src/components/`. Update imports:
- Remove `'use client'` directives (not needed in Vite SPA)
- Update `@/` path aliases to match new `src/` structure

**Step 2: Add theme script to `index.html`**

In `<head>`, before `</head>`:
```html
<script>
  // Inline the generateThemeScript() output — or import from @thesandybridge/themes
</script>
```

Alternatively, call `generateThemeScript()` in the root route component.

**Step 3: Update `src/routes/__root.tsx`**

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ThemeProvider } from '@/components/theme-provider'
import { Favicon } from '@/components/favicon'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <ThemeProvider>
      <Favicon />
      <Outlet />
    </ThemeProvider>
  )
}
```

**Step 4: Verify theme toggle works**

Run: `npm run dev`
Expected: Theme system initializes, dark/light mode works.

**Step 5: Commit**

```bash
git commit -m "feat: migrate root layout and theme system to Vite"
```

---

### Task 3: Migrate landing page with all existing demos

**Files:**
- Move: `app/page.tsx` → `src/routes/index.tsx`
- Move: `app/components/` → `src/components/`
- Modify: All `next/link` imports → `@tanstack/react-router` Link

**Step 1: Move all components from `app/components/` to `src/components/`**

Move the entire directory. For every file:
- Remove `'use client'` directives
- Replace `import Link from 'next/link'` with `import { Link } from '@tanstack/react-router'`
- Replace `<Link href="...">` with `<Link to="...">`
- Update any `@/` imports to match new paths

Key components to move:
- `productivity/ProductivityTree.tsx`, `VanillaProductivityTree.tsx`
- `filesystem/FileTree.tsx`, `VanillaFileTree.tsx`
- `realtime/RealtimeDemo.tsx`, `RealtimePane.tsx`, `VanillaRealtimePane.tsx`
- `CodeBlock.tsx`, `CopyButton.tsx`, `Footer.tsx`, `ThemePicker.tsx`
- `shared/settings/` (all settings components)
- `vanilla-icons.ts`
- Block renderers: `productivity/blocks/`, `filesystem/blocks/`, `realtime/blocks.tsx`
- Provider: `realtime/SyncChannelProvider.tsx`, `realtime/shared.ts`
- Types: `productivity/types.ts`, `filesystem/types.ts`

**Step 2: Migrate `app/page.tsx` → `src/routes/index.tsx`**

Wrap in TanStack Router `createFileRoute`:

```tsx
import { createFileRoute, Link } from '@tanstack/react-router'
// ... rest of imports (update paths)

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  // ... exact same component body, but Link from TanStack Router
}
```

Replace all `<Link href="...">` with `<Link to="...">`.

**Step 3: Verify all demo tabs work**

Run: `npm run dev`
Expected: Landing page renders with framework toggle (React/Vanilla) and demo tabs (Productivity, Filesystem, Realtime). Drag-and-drop works in all modes.

**Step 4: Commit**

```bash
git commit -m "feat: migrate landing page and all demo components to Vite"
```

---

### Task 4: Set up MDX docs system

**Files:**
- Move: `lib/shiki-config.ts` → `src/lib/shiki-config.ts`
- Move: `lib/mdx-components.tsx` → `src/lib/mdx-components.tsx`
- Move: `lib/docs-nav.ts` → `src/lib/docs-nav.ts`
- Move: `lib/docs-icons.tsx` → `src/lib/docs-icons.tsx`
- Create: `src/lib/docs-loader.ts` — build-time MDX loading

**Step 1: Move lib files to `src/lib/`**

Update import paths. Remove `next/navigation` references from `mdx-components.tsx` (if any).

**Step 2: Create MDX loader**

Since we're using `@mdx-js/rollup`, MDX files can be imported directly as React components. Create a module that imports all docs:

```ts
// src/lib/docs-loader.ts
const modules = import.meta.glob('/content/docs/*.mdx', { eager: true })

export function getDocComponent(slug: string): React.ComponentType | null {
  const key = `/content/docs/${slug}.mdx`
  const mod = modules[key] as { default: React.ComponentType } | undefined
  return mod?.default ?? null
}

export function getDocSlugs(): string[] {
  return Object.keys(modules).map(key =>
    key.replace('/content/docs/', '').replace('.mdx', '')
  )
}
```

**Step 3: Verify MDX imports work**

Create a test route that renders one doc page to confirm Shiki highlighting and custom components work.

**Step 4: Commit**

```bash
git commit -m "feat: set up MDX docs system with @mdx-js/rollup"
```

---

### Task 5: Migrate docs layout, sidebar, and header

**Files:**
- Move: `app/components/DocsHeader.tsx` → `src/components/DocsHeader.tsx`
- Move: `app/components/DocsSidebar.tsx` → `src/components/DocsSidebar.tsx`
- Create: `src/routes/docs.tsx` — docs layout route
- Create: `src/routes/docs/index.tsx` — docs home
- Create: `src/routes/docs/$slug.tsx` — dynamic doc pages
- Create: `src/routes/docs/changelog.tsx` — changelog page

**Step 1: Move DocsHeader and DocsSidebar**

Update imports:
- Replace `usePathname()` from `next/navigation` with `useLocation()` from `@tanstack/react-router`
- Replace `pathname === href` checks with `location.pathname === href`
- Replace `<Link href="...">` with `<Link to="...">`

**Step 2: Create docs layout route**

```tsx
// src/routes/docs.tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { DocsHeader } from '@/components/DocsHeader'
import { DocsSidebar } from '@/components/DocsSidebar'
import { Footer } from '@/components/Footer'

export const Route = createFileRoute('/docs')({
  component: DocsLayout,
})

function DocsLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DocsHeader />
      <div className="flex-1 max-w-6xl mx-auto w-full flex">
        <DocsSidebar />
        <main className="flex-1 px-4 sm:px-6 py-6 sm:py-8 min-w-0">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
```

**Step 3: Create docs index route**

```tsx
// src/routes/docs/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getDocComponent } from '@/lib/docs-loader'
import { docsMDXComponents } from '@/lib/mdx-components'

export const Route = createFileRoute('/docs/')({
  component: DocsHome,
})

function DocsHome() {
  const Content = getDocComponent('introduction')
  if (!Content) return <div>Not found</div>
  return (
    <div className="space-y-12">
      <Content components={docsMDXComponents} />
    </div>
  )
}
```

**Step 4: Create dynamic doc route**

```tsx
// src/routes/docs/$slug.tsx
import { createFileRoute } from '@tanstack/react-router'
import { getDocComponent } from '@/lib/docs-loader'
import { docsMDXComponents } from '@/lib/mdx-components'

export const Route = createFileRoute('/docs/$slug')({
  component: DocPage,
})

function DocPage() {
  const { slug } = Route.useParams()
  const Content = getDocComponent(slug)
  if (!Content) return <div>Page not found</div>
  return (
    <div className="space-y-12">
      <Content components={docsMDXComponents} />
    </div>
  )
}
```

**Step 5: Create changelog route**

The Next.js version fetches changelog from GitHub at runtime. For the SPA, make this a client-side fetch:

```tsx
// src/routes/docs/changelog.tsx
import { createFileRoute } from '@tanstack/react-router'
// Render the root CHANGELOG.md or fetch from GitHub

export const Route = createFileRoute('/docs/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  // Client-side fetch from GitHub raw content, or import local CHANGELOG.md
  // Render with MDX components
}
```

**Step 6: Verify docs navigation works**

Run: `npm run dev`, navigate to `/docs`
Expected: Sidebar renders, clicking items navigates to correct doc pages, syntax highlighting works.

**Step 7: Commit**

```bash
git commit -m "feat: migrate docs layout, sidebar, and all doc pages"
```

---

### Task 6: Create Svelte demo components

**Files:**
- Create: `src/components/svelte/ProductivityTreeDemo.svelte`
- Create: `src/components/svelte/FileTreeDemo.svelte`
- Create: `src/components/svelte/RealtimePaneDemo.svelte`
- Modify: `package.json` — add `@dnd-block-tree/svelte` workspace dep

**Step 1: Add svelte package dependency**

In root `package.json`, add to dependencies:
```json
"@dnd-block-tree/svelte": "*"
```

Run: `npm install`

**Step 2: Create Svelte ProductivityTree demo**

Reference the existing React `ProductivityTree.tsx` for data/behavior, and the Svelte API docs (`content/docs/svelte.mdx`, `svelte-api.mdx`, `svelte-state.mdx`) for Svelte component usage.

```svelte
<!-- src/components/svelte/ProductivityTreeDemo.svelte -->
<script lang="ts">
  import { BlockTree } from '@dnd-block-tree/svelte'
  import { createBlockState, createBlockHistory } from '@dnd-block-tree/svelte'
  // ... use same block types and initial data as React version
</script>

<BlockTree
  blocks={history.blocks}
  containerTypes={containerTypes}
  onchange={handleChange}
>
  <!-- Svelte 5 snippet renderers for section/task/note -->
</BlockTree>
```

Each Svelte demo should match the visual appearance and functionality of the React version using Svelte 5 runes (`$state`, `$derived`, `$effect`) and snippet-based rendering.

**Step 3: Create the other two demos**

- `FileTreeDemo.svelte` — mirrors React `FileTree.tsx`
- `RealtimePaneDemo.svelte` — mirrors React `RealtimePane.tsx` (without the SyncChannelProvider, which is React-specific — create a Svelte equivalent or use the vanilla deferred sync)

**Step 4: Verify Svelte components build**

Run: `npm run dev`
Expected: No build errors from Svelte components.

**Step 5: Commit**

```bash
git commit -m "feat: create Svelte demo components for all three tree demos"
```

---

### Task 7: Create React wrappers and add Svelte to framework toggle

**Files:**
- Create: `src/components/svelte/SvelteProductivityTree.tsx`
- Create: `src/components/svelte/SvelteFileTree.tsx`
- Create: `src/components/svelte/SvelteRealtimeDemo.tsx`
- Modify: `src/routes/index.tsx` — add Svelte to framework toggle

**Step 1: Create React wrapper pattern**

Each wrapper mounts a Svelte component into a ref'd div:

```tsx
// src/components/svelte/SvelteProductivityTree.tsx
import { useRef, useEffect } from 'react'
import { mount, unmount } from 'svelte'
import ProductivityTreeDemo from './ProductivityTreeDemo.svelte'

export function SvelteProductivityTree() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const component = mount(ProductivityTreeDemo, { target: ref.current! })
    return () => unmount(component)
  }, [])

  return <div ref={ref} />
}
```

Create the same pattern for `SvelteFileTree.tsx` and `SvelteRealtimeDemo.tsx`.

**Step 2: Extend framework toggle**

In `src/routes/index.tsx`:

```tsx
type Framework = 'react' | 'svelte' | 'vanilla'
```

Add a Svelte button to the framework toggle bar. Update the demo rendering:

```tsx
{activeTab === 'productivity' ? (
  framework === 'vanilla' ? <VanillaProductivityTree /> :
  framework === 'svelte' ? <SvelteProductivityTree /> :
  <ProductivityTree />
) : activeTab === 'filesystem' ? (
  framework === 'vanilla' ? <VanillaFileTree /> :
  framework === 'svelte' ? <SvelteFileTree /> :
  <FileTree />
) : (
  <RealtimeDemo framework={framework} />
)}
```

Update `RealtimeDemo.tsx` to handle `framework === 'svelte'`.

**Step 3: Verify framework toggle works with all three frameworks**

Run: `npm run dev`
Expected: Framework toggle shows React / Svelte / Vanilla. All three render correctly for all demo tabs. Drag-and-drop works in all modes.

**Step 4: Commit**

```bash
git commit -m "feat: add Svelte demos with React wrappers and three-way framework toggle"
```

---

### Task 8: Clean up Next.js artifacts and finalize

**Files:**
- Delete: `app/` directory (all Next.js pages/routes)
- Delete: `next.config.mjs` (if exists)
- Delete: `next-env.d.ts`
- Delete: `.next/` directory
- Modify: `package.json` — clean up scripts, remove Next.js references
- Modify: `turbo.json` — update demo build task if needed
- Modify: `.gitignore` — replace `.next` with `dist`

**Step 1: Delete Next.js files**

Remove: `app/`, `next.config.mjs`, `next-env.d.ts`, `.next/`

Verify no remaining `next` imports exist:

```bash
grep -r "from 'next" src/ || echo "Clean"
grep -r "next/" src/ || echo "Clean"
```

**Step 2: Update package.json**

Ensure scripts are:
```json
"dev": "vite",
"build": "turbo run build --filter='@dnd-block-tree/*' && vite build",
"preview": "vite preview",
"lint": "eslint src/",
```

Remove `eslint-config-next` from devDependencies if still present.

**Step 3: Update `.gitignore`**

Replace `.next` entries with `dist` (Vite output directory).

**Step 4: Verify full build**

Run: `npm run build`
Expected: All packages build, then Vite builds the SPA to `dist/`.

Run: `npm run preview`
Expected: Preview server at localhost:4173 shows the full site with all demos and docs.

**Step 5: Run all tests**

Run: `npm run test`
Expected: All 374 package tests still pass.

**Step 6: Commit**

```bash
git commit -m "chore: remove Next.js artifacts, finalize Vite migration"
```

---

## Summary

| Task | Description | Key Risk |
|------|-------------|----------|
| 1 | Scaffold Vite + plugins | Dual framework plugin compatibility |
| 2 | Root layout + theme | Theme script initialization timing |
| 3 | Landing page + demos | Import path updates for ~30 files |
| 4 | MDX docs system | @mdx-js/rollup + Shiki + rehype chain |
| 5 | Docs layout + routes | TanStack Router dynamic routes |
| 6 | Svelte demo components | Svelte 5 runes + @dnd-block-tree/svelte API |
| 7 | React wrappers + toggle | Svelte mount/unmount lifecycle in React |
| 8 | Cleanup | Verifying nothing references Next.js |

Tasks 1-5 are the migration core. Tasks 6-7 add the new Svelte capability. Task 8 is cleanup.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Build all packages (core, react, svelte, vanilla)
npm run lib:build

# Build everything (packages + Next.js demo)
npm run build

# Dev server (Next.js demo app)
npm run dev

# Run all tests
npm run test

# Run a single package's tests
npx vitest run --config packages/core/vitest.config.ts

# Run a single test file
npx vitest run packages/core/src/collision.test.ts

# Typecheck all packages
npm run typecheck

# Lint (Next.js demo only)
npm run lint
```

## Architecture

Turborepo monorepo with npm workspaces (`packages/*`). Four publishable packages plus a Next.js 14 demo/docs app at the root.

### Package Dependency Graph

```
@dnd-block-tree/core          (zero deps, pure TS, no DOM)
  ├── @dnd-block-tree/react   (core + @dnd-kit/core)
  ├── @dnd-block-tree/svelte  (core + @dnd-kit/svelte + @dnd-kit/dom)
  └── @dnd-block-tree/vanilla (core only, zero framework deps)
```

**Core** (`packages/core/`) — Framework-agnostic tree logic: collision detection, reducers, tree factory (`createBlockTree`), event emitter, utilities. All other packages depend on this.

**React** (`packages/react/`) — Components (`BlockTree`, `TreeRenderer`, `DropZone`, `DragOverlay`, `BlockTreeSSR`, `BlockTreeDevTools`), hooks (`useBlockHistory`, `useLayoutAnimation`, `useVirtualTree`, `useConfiguredSensors`), and `adaptCollisionDetection` bridge between core's `CoreCollisionDetection` and @dnd-kit's `CollisionDetection`.

**Svelte** (`packages/svelte/`) — Same component set as React but using Svelte 5 runes (`$state`, `$derived`, `$effect`), snippet-based rendering, and @dnd-kit/svelte. State factories: `createBlockState`, `createTreeState`, `createBlockHistory`. Built with `svelte-package`.

**Vanilla** (`packages/vanilla/`) — Two-layer architecture. Layer 1: headless `createBlockTreeController` (state machine, sensors, events — no DOM rendering). Layer 2: optional `createDefaultRenderer` (subscribes to controller events, builds DOM, sets data attributes). Custom sensors: `PointerSensor`, `TouchSensor`, `KeyboardSensor`.

### Demo App (root)

Next.js 14 app with MDX documentation (`content/docs/*.mdx`), demo trees (`components/`), and doc sidebar navigation (`lib/docs-nav.ts`). Uses `@thesandybridge/ui` design system, Tailwind CSS v4, Shiki syntax highlighting.

### Collision Detection (core)

The custom collision system is the most architecturally important part of core:

- `weightedVerticalCollision` — scores zones by nearest edge distance with bottom bias (-5px) and horizontal preference
- `createStickyCollision` — wraps any detector with hysteresis (15px threshold, reduced to 25% for cross-depth transitions) to prevent flickering
- Snapshot pattern: zone rects are frozen at drag start to prevent feedback loops from in-flow ghost preview shifting layout

Each adapter bridges core's abstract `CoreCollisionDetection` type to its framework's concrete collision interface via `adaptCollisionDetection`.

### Build

- Core, React, Vanilla use **tsup** (CJS + ESM + DTS)
- Svelte uses **svelte-package** (`-i src -o dist`)
- Turbo `build` task has `dependsOn: ["^build"]` — core always builds before adapters
- All packages have synchronized versions

## Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `build:`, `perf:`
- No Co-Authored-By lines
- All block types extend `BaseBlock` (`id`, `type`, `parentId`, `order`)
- `containerTypes` array defines which block types can have children
- Drop zone IDs follow pattern: `before-{id}`, `into-{id}`, `end-{id}`, `root-start`, `root-end`

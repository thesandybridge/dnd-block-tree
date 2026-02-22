# Changelog

All notable changes to this project will be documented in this file.

## [2.2.0] - 2026-02-22

### Build

- Make `@dnd-block-tree/core` a peerDependency in react, svelte, and vanilla adapters. Consumers now install core explicitly alongside their chosen adapter, avoiding duplicate copies and giving control over the core version.

### Docs

- Update installation instructions in all READMEs to include `@dnd-block-tree/core`
- Add per-package npm version badges to root README

## [2.1.1] - 2026-02-22

### Tests

- Add test suites for all three adapter packages (99 new tests, 338 total)
  - **Vanilla**: 75 tests across 6 files — controller, history, collision bridge, virtual scroller, pointer sensor, DOM utilities
  - **React**: 20 tests across 3 files — collision bridge, useBlockHistory, useVirtualTree
  - **Svelte**: 4 tests for the collision bridge

### Docs

- Add CLAUDE.md with build commands and architecture overview
- Replace ASCII diagram with table in vanilla overview

### Build

- Enable npm cache on publish jobs

## [2.1.0] - 2025-05-25

### Features

- Add Svelte 5 adapter (`@dnd-block-tree/svelte`) with runes-based state, snippet rendering, and @dnd-kit/svelte integration
- Add vanilla JS/TS adapter (`@dnd-block-tree/vanilla`) with headless controller, custom sensors, and optional default renderer
- Add fractional indexing support (`orderingStrategy: 'fractional'`)
- Add serialization utilities (`flatToNested`, `nestedToFlat`)
- Add `BlockTreeDevTools` component for React
- Add `BlockTreeSSR` component for hydration-safe rendering
- Add virtual scrolling support via `useVirtualTree` hook and `VirtualScroller` class
- Add layout animation (FLIP-based reorder transitions)
- Add multi-select drag with Cmd/Ctrl+Click and Shift+Click
- Add keyboard navigation with ARIA roles
- Add `maxDepth` constraint
- Add `onBeforeMove` middleware

### Build

- Migrate to Turborepo monorepo with npm workspaces
- Parallelize adapter publishing after core

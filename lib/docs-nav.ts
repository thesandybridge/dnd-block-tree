export interface DocNavItem {
  id: string
  title: string
  icon: string
  href: string
}

export interface DocNavGroup {
  title: string
  items: DocNavItem[]
}

export const DOC_NAV: DocNavGroup[] = [
  {
    title: 'Getting Started',
    items: [
      { id: 'introduction', title: 'Introduction', icon: 'BookOpen', href: '/docs' },
      { id: 'getting-started', title: 'Installation & Setup', icon: 'Package', href: '/docs/getting-started' },
    ],
  },
  {
    title: 'Headless Core',
    items: [
      { id: 'core', title: 'Core Overview', icon: 'Layers', href: '/docs/core' },
      { id: 'utilities', title: 'Utilities', icon: 'Wrench', href: '/docs/utilities' },
    ],
  },
  {
    title: 'React API',
    items: [
      { id: 'api', title: 'BlockTree Props', icon: 'Settings', href: '/docs/api' },
      { id: 'callbacks', title: 'Callbacks & Events', icon: 'Zap', href: '/docs/callbacks' },
      { id: 'types', title: 'Type Reference', icon: 'Code2', href: '/docs/types' },
    ],
  },
  {
    title: 'Features',
    items: [
      { id: 'undo-redo', title: 'Undo/Redo', icon: 'Undo2', href: '/docs/undo-redo' },
      { id: 'keyboard-navigation', title: 'Keyboard Navigation', icon: 'Keyboard', href: '/docs/keyboard-navigation' },
      { id: 'multi-select', title: 'Multi-Select', icon: 'CheckSquare', href: '/docs/multi-select' },
      { id: 'constraints', title: 'Depth & Middleware', icon: 'Shield', href: '/docs/constraints' },
      { id: 'fractional-indexing', title: 'Fractional Indexing', icon: 'GitBranch', href: '/docs/fractional-indexing' },
      { id: 'serialization', title: 'Serialization', icon: 'ArrowRightLeft', href: '/docs/serialization' },
      { id: 'touch-mobile', title: 'Touch & Mobile', icon: 'Smartphone', href: '/docs/touch-mobile' },
      { id: 'ssr', title: 'SSR Compatibility', icon: 'Server', href: '/docs/ssr' },
      { id: 'animation', title: 'Animation', icon: 'Play', href: '/docs/animation' },
      { id: 'virtual-scrolling', title: 'Virtual Scrolling', icon: 'List', href: '/docs/virtual-scrolling' },
      { id: 'devtools', title: 'DevTools', icon: 'Bug', href: '/docs/devtools' },
    ],
  },
  {
    title: 'Advanced',
    items: [
      { id: 'collision-detection', title: 'Collision Detection', icon: 'Crosshair', href: '/docs/collision-detection' },
    ],
  },
]

export const UNGROUPED_NAV: DocNavItem[] = [
  { id: 'changelog', title: 'Changelog', icon: 'FileText', href: '/docs/changelog' },
]

// Flat list for backward compat and static params
export const DOC_SECTIONS: DocNavItem[] = [
  ...DOC_NAV.flatMap(g => g.items),
  ...UNGROUPED_NAV,
]
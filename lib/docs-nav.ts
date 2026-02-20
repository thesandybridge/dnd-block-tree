export interface DocSection {
  id: string
  title: string
  icon: string
  href?: string
}

export const DOC_SECTIONS: DocSection[] = [
  { id: 'installation', title: 'Installation', icon: 'Package' },
  { id: 'basic-usage', title: 'Basic Usage', icon: 'Code2' },
  { id: 'callbacks', title: 'Callbacks & Events', icon: 'Zap' },
  { id: 'customization', title: 'Customization', icon: 'Wrench' },
  { id: 'types', title: 'Type Definitions', icon: 'Code2' },
  { id: 'exports', title: 'All Exports', icon: 'Package' },
  { id: 'changelog', title: 'Changelog', icon: 'FileText', href: '/docs/changelog' },
]

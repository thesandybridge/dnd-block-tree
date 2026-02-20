'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  code: string
  language?: string
}

// Custom theme based on oneDark but with our amber accent
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'var(--muted)',
    margin: 0,
    padding: '1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
  },
  // Override some token colors with amber accent
  keyword: {
    color: 'oklch(0.78 0.155 80)', // primary amber
  },
  function: {
    color: 'oklch(0.7 0.15 200)', // blue
  },
  string: {
    color: 'oklch(0.7 0.15 140)', // green
  },
  punctuation: {
    color: 'oklch(0.6 0.02 70)', // muted
  },
}

export function CodeBlock({ code, language = 'tsx' }: CodeBlockProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={customTheme}
      customStyle={{
        margin: 0,
        background: 'var(--muted)',
        borderRadius: '0.5rem',
      }}
    >
      {code}
    </SyntaxHighlighter>
  )
}

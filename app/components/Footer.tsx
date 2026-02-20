import Link from 'next/link'
import { Github, Layers } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-border/50 mt-auto border-t">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span className="font-mono text-primary text-sm font-medium">
                dnd-block-tree
              </span>
            </Link>
            <p className="text-muted-foreground mt-3 max-w-xs text-sm">
              A headless React library for building hierarchical drag-and-drop interfaces.
            </p>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-foreground mb-3 text-sm font-medium">Resources</h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <a
                  href="https://www.npmjs.com/package/dnd-block-tree"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  npm
                </a>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-foreground mb-3 text-sm font-medium">Connect</h3>
            <ul className="text-muted-foreground space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/thesandybridge/dnd-block-tree"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground inline-flex items-center gap-2 transition-colors"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://sandybridge.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  sandybridge.io
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="text-muted-foreground mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 text-sm md:flex-row">
          <p>&copy; {new Date().getFullYear()} sandybridge. All rights reserved.</p>
          <p className="text-muted-foreground/60 text-xs">
            Built with dnd-kit, React, and TypeScript
          </p>
        </div>
      </div>
    </footer>
  )
}

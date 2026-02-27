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

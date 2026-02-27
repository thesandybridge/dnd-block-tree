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

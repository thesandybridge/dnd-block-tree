'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface SheetContentProps {
  children: React.ReactNode
  side?: 'left' | 'right'
  className?: string
}

interface SheetTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  onClick?: () => void
}

const SheetContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => {} })

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export function SheetTrigger({ children, asChild, onClick }: SheetTriggerProps) {
  const { onOpenChange } = React.useContext(SheetContext)

  const handleClick = () => {
    onClick?.()
    onOpenChange(true)
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    })
  }

  return <button onClick={handleClick}>{children}</button>
}

export function SheetContent({ children, side = 'right', className }: SheetContentProps) {
  const { open, onOpenChange } = React.useContext(SheetContext)

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          'fixed z-50 h-full bg-background shadow-lg transition-transform duration-300 ease-in-out',
          side === 'right' ? 'right-0 top-0' : 'left-0 top-0',
          className
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  )
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>
      {children}
    </div>
  )
}

export function SheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn('text-lg font-semibold text-foreground', className)}>
      {children}
    </h2>
  )
}

import Link from "next/link"
import { Button } from "@thesandybridge/ui/components"

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-bold mb-4">Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Button asChild>
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  )
}

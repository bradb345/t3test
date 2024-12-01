import Link from "next/link"
import { Button } from "~/components/ui/button"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">404</h1>
        <p className="text-lg text-muted-foreground">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Link href="/">
          <Button className="mt-4" size="lg">
            <Home className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </div>
    </main>
  )
} 
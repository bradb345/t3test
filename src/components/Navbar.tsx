"use client"

import Link from "next/link"
import { Button } from "~/components/ui/button"

export function Navbar() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold">
            AI Test App
          </span>
        </Link>
        <div className="flex items-center">
          <Button variant="default">Sign In</Button>
        </div>
      </div>
    </div>
  )
} 
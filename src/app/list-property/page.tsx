import { Navbar } from "~/components/Navbar"

export default function ListPropertyPage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center bg-background">
        <div className="w-full max-w-6xl px-4 pt-32 pb-16">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              List Your Property
            </h1>
            <p className="text-lg text-muted-foreground">
              Reach thousands of potential tenants and manage your rental with ease
            </p>
          </div>

          {/* Add your property listing form or content here */}
          <div className="mt-16">
            {/* Content will go here */}
          </div>
        </div>
      </main>
    </>
  )
} 
export function HowRentrWorks() {
  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-center mb-12">How Rentr Works</h2>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold">1</span>
          </div>
          <h3 className="font-semibold text-xl">Create Your Listing</h3>
          <p className="text-muted-foreground">
            Add photos, details, and set your rental terms in just a few minutes
          </p>
        </div>
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold">2</span>
          </div>
          <h3 className="font-semibold text-xl">Screen Tenants</h3>
          <p className="text-muted-foreground">
            Review applications and verify potential tenants with our comprehensive screening tools
          </p>
        </div>
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold">3</span>
          </div>
          <h3 className="font-semibold text-xl">Manage Your Property</h3>
          <p className="text-muted-foreground">
            Collect rent, handle maintenance requests, and communicate with tenants all in one place
          </p>
        </div>
      </div>
    </div>
  )
} 
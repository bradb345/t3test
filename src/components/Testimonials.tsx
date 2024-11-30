export function Testimonials() {
  return (
    <div className="w-full">
      <h2 className="mb-12 text-center text-3xl font-bold">What Landlords Say About Us</h2>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10" />
            <div>
              <p className="font-semibold">Sarah Johnson</p>
              <p className="text-sm text-muted-foreground">Property Owner in Seattle</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            "Rentr has transformed how I manage my properties. The tenant screening process is seamless, 
            and the automated rent collection has saved me countless hours."
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10" />
            <div>
              <p className="font-semibold">Michael Chen</p>
              <p className="text-sm text-muted-foreground">Multi-property Investor</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            "The financial tools and reporting features are exceptional. I can track my rental income 
            and expenses effortlessly, making tax season much less stressful."
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10" />
            <div>
              <p className="font-semibold">Emily Rodriguez</p>
              <p className="text-sm text-muted-foreground">First-time Landlord</p>
            </div>
          </div>
          <p className="text-muted-foreground">
            "As a new landlord, I appreciated how user-friendly the platform is. The support team 
            was always there to help me navigate property management effectively."
          </p>
        </div>
      </div>
    </div>
  )
} 
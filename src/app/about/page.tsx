import { Card, CardContent } from "~/components/ui/card";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-4xl px-4 pb-16 pt-32">
        <div className="space-y-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            About Rentr
          </h1>
          <p className="text-lg text-muted-foreground">
            Making property rental simple and efficient for everyone
          </p>
        </div>

        <div className="mt-16 space-y-12">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Rentr, we believe finding and managing rental properties should
              be straightforward and stress-free. Our platform connects landlords
              with quality tenants while providing the tools both parties need
              for a successful rental experience.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">What We Do</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">For Landlords</h3>
                  <p className="text-sm text-muted-foreground">
                    List your properties, screen potential tenants, manage leases,
                    and handle maintenance requests all in one place.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">For Tenants</h3>
                  <p className="text-sm text-muted-foreground">
                    Search for your perfect rental, apply online, pay rent securely,
                    and communicate with your landlord easily.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Values</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">Transparency:</span>
                <span>Clear communication and honest dealings between all parties.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">Simplicity:</span>
                <span>Streamlined processes that save you time and effort.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-medium text-foreground">Security:</span>
                <span>Your data and transactions are protected with industry-standard security.</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

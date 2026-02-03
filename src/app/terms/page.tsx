export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-background">
      <div className="w-full max-w-4xl px-4 pb-16 pt-32">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="mt-12 space-y-8 text-muted-foreground">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Rentr&apos;s services, you agree to be bound by these Terms
              of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>
              Rentr provides an online platform connecting property owners (landlords) with
              individuals seeking rental housing (tenants). Our services include property
              listings, tenant applications, lease management, payment processing, and
              communication tools.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must be at least 18 years old to use our services</li>
              <li>One person may not maintain multiple accounts</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Landlord Responsibilities</h2>
            <p>Landlords using our platform agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate property information and photos</li>
              <li>Comply with all applicable fair housing laws</li>
              <li>Respond to tenant inquiries in a timely manner</li>
              <li>Maintain properties in habitable condition</li>
              <li>Process security deposits according to local laws</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Tenant Responsibilities</h2>
            <p>Tenants using our platform agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide truthful information in rental applications</li>
              <li>Pay rent and fees on time as agreed</li>
              <li>Maintain the rental property in good condition</li>
              <li>Comply with lease terms and property rules</li>
              <li>Communicate issues to landlords promptly</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Prohibited Conduct</h2>
            <p>Users may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Post false, misleading, or fraudulent information</li>
              <li>Discriminate against any protected class</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Use the platform for illegal purposes</li>
              <li>Attempt to circumvent platform fees</li>
              <li>Scrape or harvest user data</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Payments and Fees</h2>
            <p>
              Rentr may charge fees for certain services. All fees will be clearly disclosed
              before you incur them. Payment processing is handled by secure third-party
              providers. Refund policies vary by service and will be specified at the time
              of purchase.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>
              Rentr acts as a platform connecting landlords and tenants. We are not a party
              to any lease agreement and are not responsible for the conduct of users,
              property conditions, or disputes between parties. Our liability is limited
              to the maximum extent permitted by law.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms
              or engage in fraudulent activity. You may close your account at any time by
              contacting us.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of our services
              after changes constitutes acceptance of the updated terms. We will notify
              users of significant changes via email or platform notification.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">11. Contact</h2>
            <p>
              For questions about these Terms of Service, please visit our{" "}
              <a href="/contact" className="text-primary hover:underline">
                contact page
              </a>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

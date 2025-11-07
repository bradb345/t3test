export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rentr</h3>
            <p className="text-sm text-muted-foreground">
              Making property rental simple and efficient for everyone.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/about" className="hover:text-primary">About Us</a>
              </li>
              <li>
                <a href="/list-property" className="hover:text-primary">List Your Property</a>
              </li>
              <li>
                <a href="/search" className="hover:text-primary">Find Rentals</a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/help" className="hover:text-primary">Help Center</a>
              </li>
              <li>
                <a href="/contact" className="hover:text-primary">Contact Us</a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-primary">Privacy Policy</a>
              </li>
              <li>
                <a href="/terms" className="hover:text-primary">Terms of Service</a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Connect</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://facebook.com" className="hover:text-primary">Facebook</a>
              </li>
              <li>
                <a href="https://instagram.com" className="hover:text-primary">Instagram</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Rentr. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
} 
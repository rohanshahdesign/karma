import Link from "next/link"
import Image from "next/image"

export function Footer() {
  const footerLinks = {
    Product: ["Features", "Pricing", "Integrations", "Changelog"],
    Company: ["About", "Blog", "Careers", "Contact"],
    Resources: ["Documentation", "Help Center", "API Reference", "Community"],
    Legal: ["Privacy", "Terms", "Security", "GDPR"],
  }

  return (
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/Claimsy logo-black.svg"
                alt="Claimsy Logo"
                width={32}
                height={32}
              />
              <span className="text-lg font-bold text-foreground">Claimsy</span>
            </Link>
            <p className="text-sm text-muted-foreground">Build a culture of recognition with karma.</p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2025 Claimsy. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

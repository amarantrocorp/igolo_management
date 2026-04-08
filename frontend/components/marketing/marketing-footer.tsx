"use client"

import Link from "next/link"

const productLinks = [
  { label: "Features", href: "/features" },
  { label: "How it Works", href: "/features" },
  { label: "Pricing", href: "/pricing" },
]

const companyLinks = [
  { label: "About", href: "/contact" },
  { label: "Contact", href: "/contact" },
  { label: "Book a Demo", href: "/contact" },
]

export function MarketingFooter() {
  return (
    <footer className="bg-[#0F172A]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <span className="text-xl font-bold text-white">Igolo</span>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#14B8A6]">
              Interior Business OS
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              The complete operating system for interior design companies.
              Manage leads, quotations, projects, and finances — all in one
              platform.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 transition-colors hover:text-[#14B8A6]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 transition-colors hover:text-[#14B8A6]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/50">
              <li>
                <a
                  href="mailto:hello@igolo.in"
                  className="transition-colors hover:text-[#14B8A6]"
                >
                  hello@igolo.in
                </a>
              </li>
              <li>
                <a
                  href="tel:+919876543210"
                  className="transition-colors hover:text-[#14B8A6]"
                >
                  +91 98765 43210
                </a>
              </li>
              <li>WeWork Galaxy, Residency Road</li>
              <li>Bangalore 560025, India</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Igolo. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link
              href="/pricing"
              className="transition-colors hover:text-[#14B8A6]"
            >
              Privacy Policy
            </Link>
            <Link
              href="/pricing"
              className="transition-colors hover:text-[#14B8A6]"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

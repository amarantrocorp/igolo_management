"use client"

import Link from "next/link"
import { Sparkles } from "lucide-react"

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
]

const serviceLinks = [
  { label: "Interior Design", href: "/services" },
  { label: "Architecture", href: "/services" },
  { label: "3D Visualization", href: "/services" },
  { label: "Renovation", href: "/services" },
]

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "Pinterest", href: "#" },
  { label: "LinkedIn", href: "#" },
]

export function MarketingFooter() {
  return (
    <footer className="border-t border-gold/10 bg-[#080D19]">
      {/* Gold separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company */}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              <span className="font-serif text-lg font-bold text-white">
                Igolo Interior
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/40">
              Transforming spaces into extraordinary experiences since 2010.
              Premium interior design, architecture, and 3D visualization
              services across India.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/30 transition-colors hover:text-gold"
                  aria-label={link.label}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/40 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80">
              Services
            </h3>
            <ul className="mt-4 space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/40 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80">
              Contact
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-white/40">
              <li>Bangalore, Karnataka, India</li>
              <li>
                <a href="tel:+919876543210" className="transition-colors hover:text-gold">
                  +91 98765 43210
                </a>
              </li>
              <li>
                <a href="mailto:hello@igolointerior.com" className="transition-colors hover:text-gold">
                  hello@igolointerior.com
                </a>
              </li>
              <li className="pt-2 text-white/25">
                Mon - Sat: 10:00 AM - 7:00 PM
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Igolo Interior. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-white/20">
            <span>Powered by</span>
            <span className="text-gold/50">Remotion</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

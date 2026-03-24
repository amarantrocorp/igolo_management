"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
  { label: "Login", href: "/login" },
];

const productLinks = [
  { label: "CRM & Pipeline", href: "/features" },
  { label: "Quotation Builder", href: "/features" },
  { label: "Project Execution", href: "/features" },
  { label: "Financial Controls", href: "/features" },
  { label: "Client Portal", href: "/features" },
];

const socialLinks = [
  { label: "Instagram", href: "#" },
  { label: "Pinterest", href: "#" },
  { label: "LinkedIn", href: "#" },
];

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
              The complete operating system for interior design companies.
              Manage leads, quotations, projects, finances, and client
              communication — all in one platform.
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

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gold/80">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => (
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
              <li>WeWork Galaxy, Residency Road</li>
              <li>Bangalore 560025, India</li>
              <li>
                <a
                  href="tel:+918045678900"
                  className="transition-colors hover:text-gold"
                >
                  +91 80 4567 8900
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@igolohomes.com"
                  className="transition-colors hover:text-gold"
                >
                  hello@igolohomes.com
                </a>
              </li>
              <li className="pt-2 text-white/25">
                Mon - Sat: 9:00 AM - 6:00 PM IST
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Igolo Interior. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/20">
            <Link href="/pricing" className="hover:text-gold transition-colors">
              Privacy Policy
            </Link>
            <Link href="/pricing" className="hover:text-gold transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

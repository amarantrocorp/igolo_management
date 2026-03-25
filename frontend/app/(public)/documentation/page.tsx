"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Rocket,
  Layers,
  Shield,
  Users,
  FileSpreadsheet,
  CalendarClock,
  Wallet,
  Package,
  Puzzle,
  Settings,
  Server,
  Code2,
  Search,
  Mail,
  ArrowRight,
  BookOpen,
} from "lucide-react"

// ════════════════════════════════════════
// ANIMATION VARIANTS
// ════════════════════════════════════════

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

// ════════════════════════════════════════
// DATA
// ════════════════════════════════════════

const docSections = [
  {
    title: "Welcome & Getting Started",
    slug: "getting-started",
    description:
      "Set up your account, explore the dashboard, and learn the basics of Igolo Interior.",
    icon: Rocket,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    doc: "01-getting-started",
  },
  {
    title: "Managing Your Team",
    slug: "managing-team",
    description:
      "Invite team members, assign roles, and control who can access what in your organization.",
    icon: Users,
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
    doc: "02-managing-your-team",
  },
  {
    title: "Capturing & Managing Leads",
    slug: "capturing-leads",
    description:
      "Build your sales pipeline, track activities, schedule follow-ups, and convert leads into clients.",
    icon: Shield,
    color: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-400",
    doc: "03-capturing-leads",
  },
  {
    title: "Client Requirements & Site Survey",
    slug: "site-survey",
    description:
      "Measure, document, and plan your client's space before creating a quotation.",
    icon: Layers,
    color: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-400",
    doc: "04-site-survey-and-requirements",
  },
  {
    title: "Creating Quotations & Design",
    slug: "quotation-design",
    description:
      "Use the Smart Builder to create room-by-room quotations, generate PDFs, and manage versions.",
    icon: FileSpreadsheet,
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    doc: "05-quotation-design",
  },
  {
    title: "Managing Projects & Execution",
    slug: "project-execution",
    description:
      "Track sprints, log daily site updates, manage timelines, and handle variation orders.",
    icon: CalendarClock,
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
    doc: "06-project-execution",
  },
  {
    title: "Payments, Expenses & Finances",
    slug: "financial-management",
    description:
      "Manage the project wallet, track payments and expenses, and monitor profitability.",
    icon: Wallet,
    color: "from-green-500/20 to-green-500/5",
    iconColor: "text-green-400",
    doc: "07-financial-management",
  },
  {
    title: "Inventory, Vendors & Labour",
    slug: "inventory-labour",
    description:
      "Manage stock, create purchase orders, track vendor performance, and handle labour attendance and payroll.",
    icon: Package,
    color: "from-orange-500/20 to-orange-500/5",
    iconColor: "text-orange-400",
    doc: "08-inventory-and-labour",
  },
  {
    title: "Setting Up Integrations",
    slug: "integrations",
    description:
      "Connect email, WhatsApp, Razorpay payments, Google Maps, and AI floor plan analysis.",
    icon: Puzzle,
    color: "from-indigo-500/20 to-indigo-500/5",
    iconColor: "text-indigo-400",
    doc: "09-integrations",
  },
  {
    title: "Your Client's Experience",
    slug: "client-portal",
    description:
      "See what your clients see -- project progress, payments, documents, and site updates.",
    icon: Settings,
    color: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-400",
    doc: "10-client-portal",
  },
  {
    title: "Reports & Settings",
    slug: "reports-settings",
    description:
      "View financial reports, configure your account, manage billing, and customize preferences.",
    icon: Server,
    color: "from-teal-500/20 to-teal-500/5",
    iconColor: "text-teal-400",
    doc: "11-reports-and-settings",
  },
  {
    title: "Tips & Best Practices",
    slug: "tips",
    description:
      "Pro tips for lead management, quotations, project execution, and financial health.",
    icon: Code2,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    doc: "12-tips-and-best-practices",
  },
]

const quickLinks = [
  { label: "Getting Started", href: "/documentation/getting-started", icon: Rocket },
  { label: "Quotation Builder", href: "/documentation/quotation-design", icon: FileSpreadsheet },
  { label: "Tips & Best Practices", href: "/documentation/tips", icon: Code2 },
  {
    label: "Managing Your Team",
    href: "/documentation/managing-team",
    icon: Users,
  },
]

// ════════════════════════════════════════
// PAGE COMPONENT
// ════════════════════════════════════════

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSections = docSections.filter(
    (section) =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-white/5">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#CBB282]/5 via-transparent to-transparent" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#CBB282]/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 sm:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#CBB282]/10 ring-1 ring-[#CBB282]/20">
              <BookOpen className="h-8 w-8 text-[#CBB282]" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Documentation
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
              Everything you need to set up, configure, and manage your Igolo
              Interior ERP system. From first-time setup to advanced platform
              administration.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-10 max-w-xl"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-[#CBB282]/50 focus:outline-none focus:ring-1 focus:ring-[#CBB282]/30"
              />
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-3"
          >
            <span className="text-sm text-gray-500">Quick links:</span>
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-all hover:border-[#CBB282]/30 hover:bg-[#CBB282]/10 hover:text-white"
              >
                <link.icon className="h-3.5 w-3.5 text-[#CBB282]" />
                {link.label}
              </Link>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Guide Cards Grid ── */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filteredSections.map((section, i) => {
            const Icon = section.icon
            return (
              <motion.div key={section.slug} variants={fadeInUp} custom={i}>
                <Link href={`/documentation/${section.slug}`} className="group block">
                  <div className="relative h-full overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-[#CBB282]/20 hover:bg-white/[0.04]">
                    {/* Gradient hover glow */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                    />

                    <div className="relative">
                      {/* Icon */}
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] transition-colors group-hover:ring-[#CBB282]/20">
                        <Icon
                          className={`h-6 w-6 ${section.iconColor} transition-colors`}
                        />
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 text-lg font-semibold text-white">
                        {section.title}
                      </h3>

                      {/* Description */}
                      <p className="mb-4 text-sm leading-relaxed text-gray-400">
                        {section.description}
                      </p>

                      {/* Link */}
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#CBB282] transition-all group-hover:gap-2.5">
                        Read Guide
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Empty state */}
        {filteredSections.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-400">
              No results found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Try a different search term or browse all guides below.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm font-medium text-[#CBB282] hover:underline"
            >
              Clear search
            </button>
          </motion.div>
        )}
      </section>

      {/* ── Help Section ── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center sm:p-14"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#CBB282]/5 via-transparent to-blue-500/5" />

            <div className="relative">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#CBB282]/10 ring-1 ring-[#CBB282]/20">
                <Mail className="h-7 w-7 text-[#CBB282]" />
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Can&apos;t find what you need?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-gray-400">
                Our team is here to help. Reach out with any questions about
                setup, configuration, or advanced usage.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:support@igolohomes.com"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#CBB282] px-6 py-3 text-sm font-semibold text-[#0B1120] transition-all hover:bg-[#b8a070] hover:shadow-lg hover:shadow-[#CBB282]/20"
                >
                  <Mail className="h-4 w-4" />
                  support@igolohomes.com
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-all hover:border-[#CBB282]/30 hover:bg-[#CBB282]/10 hover:text-white"
                >
                  Contact Us
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

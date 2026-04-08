"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Rocket,
  Users,
  FileSpreadsheet,
  CalendarClock,
  Wallet,
  Package,
  Shield,
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
    title: "Getting Started",
    slug: "getting-started",
    description:
      "Setup your account, create your first project, and invite your team to get started with Igolo.",
    icon: Rocket,
  },
  {
    title: "Lead Management",
    slug: "capturing-leads",
    description:
      "Create and track leads, manage your sales pipeline, and convert prospects into clients.",
    icon: Shield,
  },
  {
    title: "Quotation Builder",
    slug: "quotation-design",
    description:
      "Create room-by-room quotations, add items with markup, and generate professional PDFs.",
    icon: FileSpreadsheet,
  },
  {
    title: "Project Management",
    slug: "project-execution",
    description:
      "Track sprints, log daily site updates, manage timelines, and handle variation orders.",
    icon: CalendarClock,
  },
  {
    title: "Financial Management",
    slug: "financial-management",
    description:
      "Manage the project wallet, track client payments and vendor expenses, and monitor profitability.",
    icon: Wallet,
  },
  {
    title: "Inventory & Procurement",
    slug: "inventory-labour",
    description:
      "Manage stock items, vendors, purchase orders, and bill of materials for your projects.",
    icon: Package,
  },
  {
    title: "Team & Roles",
    slug: "managing-team",
    description:
      "Set up role-based access control, manage permissions, and configure team check-in workflows.",
    icon: Users,
  },
  {
    title: "API Reference",
    slug: "tips",
    description:
      "Explore the REST API documentation for integrating Igolo with your existing tools and workflows.",
    icon: Code2,
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
    <div className="min-h-screen bg-white">
      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden border-b border-gray-200">
        <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 sm:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0D9488]/10 ring-1 ring-[#0D9488]/20">
              <BookOpen className="h-8 w-8 text-[#0D9488]" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl lg:text-6xl">
              Documentation
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-500">
              Everything you need to get started with Igolo.
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
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-[#0F172A] placeholder-gray-400 transition-colors focus:border-[#0D9488] focus:outline-none focus:ring-1 focus:ring-[#0D9488]/30"
              />
            </div>
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
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {filteredSections.map((section, i) => {
            const Icon = section.icon
            return (
              <motion.div key={section.slug} variants={fadeInUp} custom={i}>
                <Link href={`/documentation/${section.slug}`} className="group block">
                  <div className="relative h-full overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:border-[#0D9488]/30 hover:shadow-md">
                    <div className="relative">
                      {/* Icon */}
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D9488]/10">
                        <Icon className="h-6 w-6 text-[#0D9488]" />
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">
                        {section.title}
                      </h3>

                      {/* Description */}
                      <p className="mb-4 text-sm leading-relaxed text-gray-500">
                        {section.description}
                      </p>

                      {/* Link */}
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0D9488] transition-all group-hover:gap-2.5">
                        Read more
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
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-500">
              No results found
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Try a different search term or browse all guides below.
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 text-sm font-medium text-[#0D9488] hover:underline"
            >
              Clear search
            </button>
          </motion.div>
        )}
      </section>

      {/* ── Help Section ── */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center sm:p-14"
          >
            <div className="relative">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D9488]/10 ring-1 ring-[#0D9488]/20">
                <Mail className="h-7 w-7 text-[#0D9488]" />
              </div>
              <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
                Can&apos;t find what you need?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-gray-500">
                Our team is here to help. Reach out with any questions about
                setup, configuration, or advanced usage.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href="mailto:support@igolo.in"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0D9488] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#0B7C72]"
                >
                  <Mail className="h-4 w-4" />
                  support@igolo.in
                </a>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-[#0F172A] transition-all hover:border-[#0D9488]/30 hover:text-[#0D9488]"
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

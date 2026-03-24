"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import {
  Users,
  FileSpreadsheet,
  CalendarClock,
  Wallet,
  Package,
  HardHat,
  MonitorSmartphone,
  BarChart3,
} from "lucide-react"

const featureSections = [
  {
    title: "Lead Management & CRM",
    icon: Users,
    bullets: [
      "Visual Kanban pipeline with drag-and-drop stage transitions",
      "Automated lead scoring based on engagement and budget fit",
      "Source tracking across website, referrals, and campaigns",
      "Auto-assignment rules to distribute leads to your sales team",
      "Complete interaction history with notes and follow-up reminders",
    ],
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
  {
    title: "Smart Quotation Builder",
    icon: FileSpreadsheet,
    bullets: [
      "7-step guided wizard from client details to final approval",
      "Room-by-room pricing with item-level markup controls",
      "AI-powered floor plan analysis for automatic measurements",
      "One-click professional PDF generation with your branding",
      "Full version history with side-by-side comparison (v1, v2, v3...)",
    ],
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
  },
  {
    title: "Sprint-Based Project Execution",
    icon: CalendarClock,
    bullets: [
      "6 standardised phases: Design, Civil, MEP, Carpentry, Finishing, Handover",
      "Interactive Gantt charts with dependency-aware scheduling",
      "Daily progress logs with mandatory photo uploads",
      "Automatic date cascading when timelines shift",
      "Variation Order management with client approval workflow",
    ],
    image:
      "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&q=80",
  },
  {
    title: "Financial Controls & Billing",
    icon: Wallet,
    bullets: [
      "Per-project wallets with real-time balance tracking",
      "Spending locks that prevent over-expenditure automatically",
      "Milestone-based billing tied to project phases",
      "Razorpay payment gateway for seamless client payments",
      "Profit tracking with burn-rate alerts and margin analysis",
    ],
    image:
      "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=800&q=80",
  },
  {
    title: "Inventory & Procurement",
    icon: Package,
    bullets: [
      "Dual-track stock management: warehouse vs project-specific",
      "Vendor purchase orders with approval workflow and GRN",
      "Goods receiving with automatic stock level updates",
      "Price auto-updates when vendor bill variance is detected",
      "Low stock alerts with one-click reorder generation",
    ],
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  },
  {
    title: "Labour & Attendance",
    icon: HardHat,
    bullets: [
      "Digital attendance with mandatory site photo verification",
      "Support for daily wage and contract-based payment models",
      "Automated weekly payroll generation grouped by team",
      "Team performance analytics with cost-per-sqft metrics",
    ],
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
  },
  {
    title: "Client Portal",
    icon: MonitorSmartphone,
    bullets: [
      "Dedicated client login with personalised dashboard",
      "Real-time project tracking with sprint progress visibility",
      "Online payments via secure gateway integration",
      "Document access for quotations, invoices, and contracts",
      "Daily site updates with photo gallery from supervisors",
    ],
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  },
  {
    title: "Reports & Analytics",
    icon: BarChart3,
    bullets: [
      "Financial summaries with receivable vs payable breakdown",
      "Project profitability reports with margin analysis",
      "Material consumption tracking across projects and vendors",
      "Export any report to CSV or PDF for offline review",
      "Custom date range filters and role-based report access",
    ],
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
  },
]

function FeatureSection({
  section,
  index,
}: {
  section: (typeof featureSections)[number]
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const isReversed = index % 2 === 1
  const Icon = section.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
        isReversed ? "lg:direction-rtl" : ""
      }`}
    >
      <div className={`space-y-6 ${isReversed ? "lg:order-2" : "lg:order-1"}`}>
        <motion.div
          initial={{ opacity: 0, x: isReversed ? 30 : -30 }}
          animate={
            isInView
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: isReversed ? 30 : -30 }
          }
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-4"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#CBB282]/10 border border-[#CBB282]/20">
            <Icon className="h-6 w-6 text-[#CBB282]" />
          </div>
          <div>
            <span className="text-sm font-medium text-[#CBB282]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {section.title}
            </h2>
          </div>
        </motion.div>

        <ul className="space-y-3">
          {section.bullets.map((bullet, bulletIndex) => (
            <motion.li
              key={bullet}
              initial={{ opacity: 0, x: isReversed ? 20 : -20 }}
              animate={
                isInView
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: isReversed ? 20 : -20 }
              }
              transition={{ duration: 0.4, delay: 0.3 + bulletIndex * 0.1 }}
              className="flex items-start gap-3 text-gray-400"
            >
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#CBB282] flex-shrink-0" />
              <span className="text-sm leading-relaxed">{bullet}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={
          isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }
        }
        transition={{ duration: 0.6, delay: 0.3 }}
        className={`relative ${isReversed ? "lg:order-1" : "lg:order-2"}`}
      >
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <Image
            src={section.image}
            alt={section.title}
            width={800}
            height={500}
            className="w-full h-auto object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120]/60 to-transparent" />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FeaturesPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroInView = useInView(heroRef, { once: true })
  const ctaRef = useRef<HTMLDivElement>(null)
  const ctaInView = useInView(ctaRef, { once: true, margin: "-100px" })

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 40 }}
          animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-24"
        >
          <span className="inline-block text-sm font-medium text-[#CBB282] tracking-widest uppercase mb-4">
            Platform Features
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto">
            Built for Every Stage of Your Interior Business
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            From first client contact to final handover, manage your entire
            interior design workflow with purpose-built tools that keep your
            projects profitable and on schedule.
          </p>
        </motion.div>

        {/* Feature Sections */}
        <div className="space-y-28 md:space-y-36 max-w-6xl mx-auto">
          {featureSections.map((section, index) => (
            <FeatureSection
              key={section.title}
              section={section}
              index={index}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          ref={ctaRef}
          initial={{ opacity: 0, y: 40 }}
          animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6 }}
          className="mt-32 text-center"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-gray-400 mb-8">
              Join interior design firms already streamlining their operations
              with our all-in-one platform.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-[#CBB282] text-[#0B1120] hover:bg-[#CBB282]/90 font-semibold px-8"
              >
                Start Free Trial
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

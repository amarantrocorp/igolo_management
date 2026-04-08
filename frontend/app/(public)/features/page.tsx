"use client"

import Link from "next/link"
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
  Building2,
  CheckCircle2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface FeatureSection {
  title: string
  icon: LucideIcon
  badge: string
  bullets: string[]
  mockup: {
    type: "cards" | "pipeline" | "timeline" | "chart" | "grid" | "checklist" | "portal" | "tenants"
  }
}

const featureSections: FeatureSection[] = [
  {
    title: "Lead & CRM Management",
    icon: Users,
    badge: "Sales",
    bullets: [
      "Capture leads from multiple sources",
      "Track lead status pipeline (New -> Contacted -> Qualified -> Quote Sent -> Converted)",
      "Assign leads to sales team",
      "Property details, BHK config, budget tracking",
      "Categorized file uploads (floor plans, site photos, reference images)",
    ],
    mockup: { type: "pipeline" },
  },
  {
    title: "Smart Quotation Builder",
    icon: FileSpreadsheet,
    badge: "Quotations",
    bullets: [
      "AI-powered room detection from floor plans",
      "Package-based pricing (Basic / Standard / Premium / Luxury)",
      "Room-by-room item selection with auto-calculated quantities",
      "Room Builder for detailed BOQ (wall-by-wall specs, electrical planning)",
      "PDF generation and WhatsApp sharing",
    ],
    mockup: { type: "cards" },
  },
  {
    title: "Project Execution & Sprint Management",
    icon: CalendarClock,
    badge: "Execution",
    bullets: [
      "6-phase standard sprint system (Design -> Civil -> MEP -> Carpentry -> Finishing -> Handover)",
      "Gantt timeline with dependency management",
      "Daily progress logs with photo uploads",
      "Variation Order (VO) tracking",
    ],
    mockup: { type: "timeline" },
  },
  {
    title: "Financial Control & Project Wallet",
    icon: Wallet,
    badge: "Finance",
    bullets: [
      "Per-project wallet (Received vs Spent tracking)",
      "Spending lock — no expense without funds",
      "Client payment milestones",
      "Vendor payments, labor payments, petty cash tracking",
      "Real-time profitability dashboard",
    ],
    mockup: { type: "chart" },
  },
  {
    title: "Inventory & Procurement (BOM)",
    icon: Package,
    badge: "Inventory",
    bullets: [
      "Bill of Materials auto-generated from quotations",
      "Stock tracking with reorder alerts",
      "Vendor management with supplier pricing",
      "Purchase Order workflow (Draft -> Ordered -> Received)",
      "Toggle inventory on/off per organization",
    ],
    mockup: { type: "grid" },
  },
  {
    title: "Team & Labor Management",
    icon: HardHat,
    badge: "Team",
    bullets: [
      "Role-based access (Super Admin, Manager, BDE, Sales, Supervisor, Client)",
      "Supervisor check-in with GPS geofencing",
      "Labor attendance tracking (daily wage & contract)",
      "Weekly payroll generation",
    ],
    mockup: { type: "checklist" },
  },
  {
    title: "Client Portal",
    icon: MonitorSmartphone,
    badge: "Portal",
    bullets: [
      "Project status visibility",
      "Sprint progress tracking",
      "Payment history and online payments",
      "Daily log feed (manager-controlled visibility)",
    ],
    mockup: { type: "portal" },
  },
  {
    title: "Multi-Tenant SaaS",
    icon: Building2,
    badge: "Platform",
    bullets: [
      "Separate organization with isolated data",
      "Plan-based feature limits",
      "Team invitation system",
      "Organization settings and branding",
    ],
    mockup: { type: "tenants" },
  },
]

/* ---------- Decorative Mockups ---------- */

function PipelineMockup() {
  const stages = ["New", "Contacted", "Qualified", "Converted"]
  return (
    <div className="flex items-center gap-2">
      {stages.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`rounded-lg px-3 py-2 text-xs font-medium ${
              i < 3
                ? "bg-teal-50 text-teal-700 border border-teal-200"
                : "bg-teal-600 text-white"
            }`}
          >
            {s}
          </div>
          {i < stages.length - 1 && (
            <div className="h-px w-4 bg-slate-300" />
          )}
        </div>
      ))}
    </div>
  )
}

function CardsMockup() {
  const rooms = [
    { name: "Kitchen", price: "2,45,000" },
    { name: "Master Bedroom", price: "1,80,000" },
    { name: "Living Room", price: "1,20,000" },
  ]
  return (
    <div className="space-y-2">
      {rooms.map((r) => (
        <div
          key={r.name}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
        >
          <span className="text-sm font-medium text-slate-700">{r.name}</span>
          <span className="text-sm font-semibold text-teal-600">
            Rs. {r.price}
          </span>
        </div>
      ))}
    </div>
  )
}

function TimelineMockup() {
  const sprints = [
    { name: "Design", pct: 100 },
    { name: "Civil", pct: 70 },
    { name: "MEP", pct: 0 },
    { name: "Carpentry", pct: 0 },
  ]
  return (
    <div className="space-y-3">
      {sprints.map((s) => (
        <div key={s.name} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">{s.name}</span>
            <span className="text-slate-400">{s.pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-teal-500 transition-all"
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ChartMockup() {
  const bars = [
    { label: "Received", h: 80, color: "bg-teal-500" },
    { label: "Spent", h: 55, color: "bg-orange-400" },
    { label: "Balance", h: 25, color: "bg-emerald-400" },
  ]
  return (
    <div className="flex items-end gap-6 h-28">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-1">
          <div
            className={`w-10 rounded-t-md ${b.color}`}
            style={{ height: `${b.h}%` }}
          />
          <span className="text-[10px] font-medium text-slate-500">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function GridMockup() {
  const items = [
    { name: "Plywood 18mm", stock: 120, alert: false },
    { name: "Cement (50kg)", stock: 8, alert: true },
    { name: "Tiles (Vitrified)", stock: 240, alert: false },
  ]
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div
          key={it.name}
          className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
            it.alert
              ? "border-red-200 bg-red-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <span className="text-sm text-slate-700">{it.name}</span>
          <span
            className={`text-xs font-semibold ${
              it.alert ? "text-red-600" : "text-slate-500"
            }`}
          >
            {it.stock} units
          </span>
        </div>
      ))}
    </div>
  )
}

function ChecklistMockup() {
  const roles = [
    { name: "Super Admin", active: true },
    { name: "Manager", active: true },
    { name: "Supervisor", active: true },
    { name: "Sales / BDE", active: false },
  ]
  return (
    <div className="space-y-2">
      {roles.map((r) => (
        <div
          key={r.name}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5"
        >
          <div
            className={`h-3 w-3 rounded-full ${
              r.active ? "bg-teal-500" : "bg-slate-300"
            }`}
          />
          <span className="text-sm text-slate-700">{r.name}</span>
        </div>
      ))}
    </div>
  )
}

function PortalMockup() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-400 mb-1">Project Status</div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-teal-500" />
          <span className="text-sm font-medium text-slate-700">
            In Progress - Sprint 4
          </span>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs text-slate-400 mb-1">Next Payment Due</div>
        <span className="text-sm font-semibold text-teal-600">
          Rs. 2,50,000
        </span>
      </div>
    </div>
  )
}

function TenantsMockup() {
  const orgs = ["Igolo Interiors", "Design Studio Pro", "HomeCraft Ltd."]
  return (
    <div className="space-y-2">
      {orgs.map((o, i) => (
        <div
          key={o}
          className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${
            i === 0
              ? "border-teal-200 bg-teal-50"
              : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold text-white">
            {o[0]}
          </div>
          <span className="text-sm font-medium text-slate-700">{o}</span>
        </div>
      ))}
    </div>
  )
}

function MockupRenderer({
  type,
}: {
  type: FeatureSection["mockup"]["type"]
}) {
  switch (type) {
    case "pipeline":
      return <PipelineMockup />
    case "cards":
      return <CardsMockup />
    case "timeline":
      return <TimelineMockup />
    case "chart":
      return <ChartMockup />
    case "grid":
      return <GridMockup />
    case "checklist":
      return <ChecklistMockup />
    case "portal":
      return <PortalMockup />
    case "tenants":
      return <TenantsMockup />
  }
}

/* ---------- Feature Section Component ---------- */

function FeatureSectionBlock({
  section,
  index,
}: {
  section: FeatureSection
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const isReversed = index % 2 === 1
  const Icon = section.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
    >
      {/* Text side */}
      <div
        className={`space-y-6 ${isReversed ? "lg:order-2" : "lg:order-1"}`}
      >
        <motion.div
          initial={{ opacity: 0, x: isReversed ? 20 : -20 }}
          animate={
            isInView
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: isReversed ? 20 : -20 }
          }
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 border border-teal-200 mb-4">
            <Icon className="h-3.5 w-3.5" />
            {section.badge}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">
            {section.title}
          </h2>
        </motion.div>

        <ul className="space-y-3">
          {section.bullets.map((bullet, bulletIndex) => (
            <motion.li
              key={bullet}
              initial={{ opacity: 0, x: isReversed ? 15 : -15 }}
              animate={
                isInView
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: isReversed ? 15 : -15 }
              }
              transition={{ duration: 0.4, delay: 0.25 + bulletIndex * 0.07 }}
              className="flex items-start gap-3 text-slate-600"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-teal-500 flex-shrink-0" />
              <span className="text-sm leading-relaxed">{bullet}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Mockup side */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={
          isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }
        }
        transition={{ duration: 0.6, delay: 0.2 }}
        className={`relative ${isReversed ? "lg:order-1" : "lg:order-2"}`}
      >
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 p-8 shadow-sm">
          {/* Decorative dots */}
          <div className="absolute top-4 left-4 flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-300" />
          </div>
          <div className="mt-4">
            <MockupRenderer type={section.mockup.type} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ---------- Page ---------- */

export default function FeaturesPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroInView = useInView(heroRef, { once: true })
  const ctaRef = useRef<HTMLDivElement>(null)
  const ctaInView = useInView(ctaRef, { once: true, margin: "-80px" })

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 30 }}
            animate={
              heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
            }
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block rounded-full bg-teal-50 px-4 py-1.5 text-sm font-semibold text-teal-700 border border-teal-200 mb-6">
              Features
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F172A]">
              Powerful Features for Interior Companies
            </h1>
            <p className="mt-6 text-lg text-slate-500 leading-relaxed">
              From lead capture to project handover — every tool your interior
              business needs.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Sections */}
      <section className="pb-24 md:pb-32">
        <div className="container mx-auto px-4">
          <div className="space-y-24 md:space-y-32 max-w-6xl mx-auto">
            {featureSections.map((section, index) => (
              <FeatureSectionBlock
                key={section.title}
                section={section}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#0F172A] py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            ref={ctaRef}
            initial={{ opacity: 0, y: 30 }}
            animate={
              ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }
            }
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to streamline your interior business?
            </h2>
            <p className="text-slate-400 mb-8 text-lg">
              See how Igolo can transform the way your team manages leads,
              quotations, projects, and finances.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                className="bg-teal-500 text-white hover:bg-teal-600 font-semibold px-8 text-base"
              >
                Book a Demo
                <span className="ml-1">&rarr;</span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

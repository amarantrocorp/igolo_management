"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  Construction,
  IndianRupee,
  Users,
  FileText,
  Briefcase,
  Truck,
  Receipt,
  CreditCard,
  Sparkles,
  Brain,
  CalendarClock,
  BarChart3,
  MessageSquareText,
  Target,
  ClipboardList,
  Palette,
  Send,
  FolderKanban,
  Wallet,
  ListChecks,
  Bot,
  Star,
  Quote,
  ChevronRight,
} from "lucide-react"

// ════════════════════════════════════════
// DATA
// ════════════════════════════════════════

const painPoints = [
  {
    icon: <AlertTriangle className="h-6 w-6" />,
    title: "No Central System",
    description:
      "Leads in Excel, quotes in Word, photos on WhatsApp. Your data lives in 10 different places with zero connection.",
  },
  {
    icon: <FileQuestion className="h-6 w-6" />,
    title: "Quotation Confusion",
    description:
      "Version 1, version 2, version final-final. Tracking revisions and pricing changes across rooms is a nightmare.",
  },
  {
    icon: <Construction className="h-6 w-6" />,
    title: "Execution Chaos",
    description:
      "No visibility into what is happening on site. Missed timelines, no daily logs, and zero accountability from teams.",
  },
  {
    icon: <IndianRupee className="h-6 w-6" />,
    title: "Expense Leakage",
    description:
      "Money goes out but you cannot track where. Vendor bills, labor costs, and petty cash disappear into a black hole.",
  },
]

const aiFeatures = [
  {
    icon: <Brain className="h-5 w-5" />,
    title: "AI Quotation Builder",
    description: "Upload a floor plan and get a complete room-by-room quotation auto-generated in minutes.",
  },
  {
    icon: <CalendarClock className="h-5 w-5" />,
    title: "Smart Project Planning",
    description: "AI schedules your 6-phase execution plan with automatic timeline cascading on delays.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Expense Intelligence",
    description: "Real-time spending alerts, burn rate analysis, and profitability predictions per project.",
  },
  {
    icon: <MessageSquareText className="h-5 w-5" />,
    title: "AI Assistant",
    description: "Ask questions about your projects, get instant reports, and automate repetitive tasks.",
  },
]

const stats = [
  { value: "50+", label: "PROJECTS MANAGED" },
  { value: "500+", label: "QUOTATIONS GENERATED" },
  { value: "10+", label: "TEAMS ONBOARDED" },
  { value: "3x", label: "FASTER EXECUTION" },
]

const features = [
  {
    icon: <Target className="h-6 w-6" />,
    title: "Lead Management",
    description: "Capture leads from any source, track interactions, and move them through your sales pipeline automatically.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Smart Quotation",
    description: "Build room-by-room quotations with auto-pricing, version history, markup controls, and PDF generation.",
    color: "bg-teal-50 text-teal-600",
  },
  {
    icon: <FolderKanban className="h-6 w-6" />,
    title: "Project Execution",
    description: "6-phase sprint system with Gantt charts, daily site logs, photo uploads, and automatic delay cascading.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: <Truck className="h-6 w-6" />,
    title: "Vendor & Procurement",
    description: "Manage vendors, create purchase orders, track deliveries, and auto-update pricing from vendor bills.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: <Wallet className="h-6 w-6" />,
    title: "Expense Management",
    description: "Per-project wallets with spending locks, real-time balance tracking, and financial guardrails.",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Billing & Payments",
    description: "Milestone-based invoicing, online payment collection via Razorpay, and automated payment receipts.",
    color: "bg-green-50 text-green-600",
  },
]

const timelineSteps = [
  { label: "Lead Dashboard", description: "Capture and qualify leads from all sources" },
  { label: "Requirements Mapped", description: "Site visit, measurements, and client preferences" },
  { label: "Layout & Design", description: "2D layouts, 3D renders, and material selection" },
  { label: "Quotation Shared", description: "Room-by-room pricing with professional PDFs" },
  { label: "Project Created", description: "Auto-generate 6-phase execution plan" },
  { label: "Budget Tracked", description: "Per-project wallet with spending controls" },
  { label: "Weekly Tasks", description: "Sprint-based execution with daily logs" },
  { label: "AI DPR & Alerts", description: "Automated daily progress reports and alerts" },
  { label: "Happy Handover", description: "Final inspection, snag list, and key handover" },
]

const whyUsCards = [
  {
    title: "Interior-First",
    description: "Built specifically for interior design companies. Not generic project management software retrofitted for your industry.",
  },
  {
    title: "Faster Execution",
    description: "Standardized 6-phase workflow reduces project delays by up to 40%. Every team knows exactly what to do next.",
  },
  {
    title: "Financial Control",
    description: "Per-project wallets with spending locks prevent expense leakage. Know your profitability in real-time.",
  },
  {
    title: "Client Delight",
    description: "Give clients their own portal to track progress, view photos, make payments, and communicate with your team.",
  },
]

const testimonials = [
  {
    quote: "We reduced our quotation time from 3 days to 30 minutes. The auto-pricing engine is a game changer for our team.",
    name: "Priya Sharma",
    title: "Founder, DesignCraft Interiors",
    location: "Bangalore",
  },
  {
    quote: "The financial controls saved us from bleeding money. We can see exactly where every rupee goes across all projects.",
    name: "Vikram Mehta",
    title: "CEO, Urban Nest Studios",
    location: "Mumbai",
  },
  {
    quote: "Our clients love the portal. They track progress, see photos, and pay online. No more WhatsApp chaos.",
    name: "Anita Desai",
    title: "Director, Livespace Interiors",
    location: "Delhi",
  },
]

// ════════════════════════════════════════
// SECTION COMPONENTS
// ════════════════════════════════════════

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Content */}
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Run Your Interior Projects.
              <span className="mt-2 block text-teal-600/70">Without the Chaos.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-500">
              Manage leads, quotations, execution, vendors, and payments — all in one
              powerful system built for interior companies.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0D9488]/90"
              >
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                View Features
              </a>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
              <CheckCircle2 className="h-4 w-4 text-[#0D9488]" />
              Built for modern interior companies handling multiple projects and teams.
            </div>
          </div>

          {/* Right Mockup */}
          <div className="relative hidden lg:block">
            <div className="relative mx-auto w-full max-w-md">
              {/* Main Card */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D9488]/10">
                    <Sparkles className="h-4 w-4 text-[#0D9488]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Igolo Dashboard</div>
                    <div className="text-xs text-gray-400">3 active projects</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Villa Whitefield</span>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        On Track
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                      <div className="h-1.5 w-[65%] rounded-full bg-[#0D9488]" />
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">Sprint 4: Carpentry - 65% complete</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-600">Apartment HSR Layout</span>
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                        Delayed
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                      <div className="h-1.5 w-[40%] rounded-full bg-yellow-500" />
                    </div>
                    <div className="mt-1 text-[10px] text-gray-400">Sprint 3: MEP - 40% complete</div>
                  </div>
                </div>
              </div>

              {/* Floating Notification Cards */}
              <div className="absolute -left-12 top-4 animate-pulse rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700">BoQ Parsed</span>
                </div>
              </div>
              <div className="absolute -right-8 top-1/3 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                    <FileText className="h-3 w-3 text-blue-600" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700">Drag & Drop BoQ.xlsx</span>
                </div>
              </div>
              <div className="absolute -left-6 bottom-8 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-100">
                    <Send className="h-3 w-3 text-purple-600" />
                  </div>
                  <span className="text-[11px] font-medium text-gray-700">PO Auto-Sent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PainPointsSection() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Managing Interior Projects Shouldn&apos;t Be This Messy
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Most interior companies struggle with scattered tools, manual tracking, and zero
            visibility across projects.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {painPoints.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-500">
                {item.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function AIPoweredSection() {
  return (
    <section className="bg-gradient-to-br from-teal-50 via-emerald-50/50 to-cyan-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Content */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0D9488]/10 px-3 py-1 text-xs font-semibold text-[#0D9488]">
              <Sparkles className="h-3 w-3" />
              AI-Powered Interior Business OS
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Your Interior Business.
              <br />
              Now Powered by AI.
            </h2>
            <div className="mt-8 space-y-6">
              {aiFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D9488]/10 text-[#0D9488]">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0D9488]/90"
              >
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Right Mockup */}
          <div className="relative hidden lg:block">
            <div className="mx-auto max-w-sm">
              <div className="rounded-2xl border border-teal-200/50 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D9488]">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Igolo AI Engine</div>
                    <div className="text-xs text-[#0D9488]">Processing Quote...</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg bg-teal-50 p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-[#0D9488]" />
                      <span className="text-xs font-medium text-[#0D9488]">Floor plan detected</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <div className="rounded bg-teal-100/50 p-1 text-center text-[9px] text-teal-700">
                        Kitchen
                      </div>
                      <div className="rounded bg-teal-100/50 p-1 text-center text-[9px] text-teal-700">
                        Bedroom
                      </div>
                      <div className="rounded bg-teal-100/50 p-1 text-center text-[9px] text-teal-700">
                        Living
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-100 p-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                      Generating Quotation
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Kitchen - Modular</span>
                        <span className="text-xs font-medium text-gray-900">2,45,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Master Bedroom</span>
                        <span className="text-xs font-medium text-gray-900">1,80,000</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Living Room</span>
                        <span className="text-xs font-medium text-gray-900">1,20,000</span>
                      </div>
                      <div className="mt-2 border-t border-dashed pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">Total</span>
                          <span className="text-xs font-bold text-[#0D9488]">5,45,000</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700">Quotation Finalized</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatsBanner() {
  return (
    <section className="bg-[#0F172A] py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="mb-12 text-center text-2xl font-bold text-white sm:text-3xl">
          Built for Interior Teams That Deliver at Scale
        </h2>
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-[#0D9488] sm:text-4xl">{stat.value}</div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureGridSection() {
  return (
    <section id="features" className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything You Need to Run Your Interior Business
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            From first lead to final handover — manage every step in one system.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${feature.color}`}
              >
                {feature.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WorkflowTimelineSection() {
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="overflow-hidden rounded-2xl bg-[#0F172A] p-8 lg:p-14">
          <h2 className="mb-4 text-center text-2xl font-bold text-white sm:text-3xl">
            From First Enquiry to Final Handover — Seamlessly Managed
          </h2>
          <p className="mx-auto mb-14 max-w-xl text-center text-sm text-gray-400">
            Every stage of your interior project lifecycle, connected in one workflow.
          </p>

          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Timeline */}
            <div className="relative">
              <div className="absolute bottom-0 left-[15px] top-0 w-px bg-gray-700" />
              <div className="space-y-6">
                {timelineSteps.map((step, i) => (
                  <div key={step.label} className="relative flex gap-4 pl-0">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#0D9488] bg-[#0F172A] text-xs font-bold text-[#0D9488]">
                      {i + 1}
                    </div>
                    <div className="pb-0">
                      <div className="text-sm font-semibold text-white">{step.label}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{step.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Mockup Card */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-800/50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Quotation Preview
                    </div>
                    <div className="mt-1 text-sm font-semibold text-white">
                      Villa Whitefield - v2
                    </div>
                  </div>
                  <span className="rounded-full bg-[#0D9488]/20 px-2.5 py-0.5 text-[10px] font-medium text-[#0D9488]">
                    Approved
                  </span>
                </div>

                <div className="space-y-2 rounded-lg bg-gray-900/50 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Kitchen - Modular</span>
                    <span className="font-medium text-white">2,45,000</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Master Bedroom</span>
                    <span className="font-medium text-white">1,80,000</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Living Room</span>
                    <span className="font-medium text-white">1,20,000</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Guest Bedroom</span>
                    <span className="font-medium text-white">95,000</span>
                  </div>
                  <div className="border-t border-dashed border-gray-600 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300">Total Project Value</span>
                      <span className="font-bold text-[#0D9488]">6,40,000</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white">
                    <Send className="h-3 w-3" />
                    Send via WhatsApp
                  </button>
                  <button className="flex items-center justify-center rounded-lg border border-gray-600 px-3 py-2 text-xs font-medium text-gray-300">
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function WhyUsSection() {
  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Built for Interior Companies. Not Generic Software.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Igolo understands the interior design workflow. Every feature is designed for how you
            actually work.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyUsCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D9488]/10">
                <CheckCircle2 className="h-5 w-5 text-[#0D9488]" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section className="bg-gray-50 py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            What Interior Teams Say
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Trusted by interior design companies across India.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm leading-relaxed text-gray-600">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D9488]/10 text-sm font-bold text-[#0D9488]">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-400">
                    {item.title}, {item.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTASection() {
  return (
    <section className="bg-gradient-to-br from-[#0F172A] via-[#0F172A] to-[#0D9488]/40 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to Simplify Your Interior Business?
        </h2>
        <p className="mt-4 text-lg text-gray-300">
          Join interior design companies already using Igolo to streamline operations, delight
          clients, and grow profitably.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0D9488] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0D9488]/90"
          >
            Book a Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Talk to Sales
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
          <CheckCircle2 className="h-4 w-4 text-[#0D9488]" />
          No complex setup. Get started quickly with guided onboarding.
        </div>
      </div>
    </section>
  )
}

// ════════════════════════════════════════
// PAGE
// ════════════════════════════════════════

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <PainPointsSection />
      <AIPoweredSection />
      <StatsBanner />
      <FeatureGridSection />
      <WorkflowTimelineSection />
      <WhyUsSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}

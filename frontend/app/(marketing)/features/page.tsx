import Link from "next/link"
import {
  Users,
  FileText,
  FolderKanban,
  Wallet,
  Monitor,
  UserCog,
  Plug,
  ArrowRight,
  CheckCircle2,
  Target,
  BarChart3,
  CalendarDays,
  MessageSquare,
  Camera,
  Shield,
  Clock,
  Calculator,
  Receipt,
  CreditCard,
  PieChart,
  Lock,
  UserPlus,
  ClipboardList,
  DollarSign,
  Mail,
  MapPin,
  Brain,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface FeatureDetail {
  icon: React.ElementType
  text: string
}

interface FeatureSection {
  id: string
  icon: React.ElementType
  title: string
  description: string
  details: FeatureDetail[]
  gradient: string
}

const featureSections: FeatureSection[] = [
  {
    id: "crm",
    icon: Users,
    title: "CRM & Lead Management",
    description:
      "Capture every lead and track them through your entire sales pipeline. Never lose a potential client again.",
    details: [
      { icon: Target, text: "Visual pipeline view with drag-and-drop stage management" },
      { icon: BarChart3, text: "Lead scoring based on budget, timeline, and engagement" },
      { icon: CalendarDays, text: "Automated follow-up reminders and task scheduling" },
      { icon: MessageSquare, text: "Source tracking (Website, Referral, Social Media, Walk-in)" },
      { icon: ClipboardList, text: "Property details capture: type, area, scope of work" },
      { icon: Camera, text: "Site visit scheduling with availability preferences" },
    ],
    gradient: "from-blue-500/10 to-cyan-500/10",
  },
  {
    id: "quotations",
    icon: FileText,
    title: "Smart Quotation Engine",
    description:
      "Build professional, room-wise quotations in minutes with auto-pricing, versioning, and PDF generation.",
    details: [
      { icon: Brain, text: "AI floor plan analysis for instant room detection and area calculation" },
      { icon: Calculator, text: "Auto-pricing with configurable markup percentages per item" },
      { icon: FileText, text: "Room-wise breakdown: Kitchen, Bedroom, Living Room, etc." },
      { icon: Receipt, text: "Professional PDF generation with cover page and detailed tables" },
      { icon: Clock, text: "Version control (v1, v2, v3...) with comparison view" },
      { icon: Send, text: "One-click email delivery with branded quotation PDFs" },
    ],
    gradient: "from-amber-500/10 to-orange-500/10",
  },
  {
    id: "projects",
    icon: FolderKanban,
    title: "Project Execution",
    description:
      "Execute projects through a standardized 6-phase sprint system designed specifically for interior design workflows.",
    details: [
      { icon: CalendarDays, text: "6-phase sprint system: Design, Civil, MEP, Carpentry, Finishing, Handover" },
      { icon: BarChart3, text: "Interactive Gantt chart timeline with drag-to-reschedule" },
      { icon: Camera, text: "Daily progress logs with mandatory photo uploads" },
      { icon: Clock, text: "Automatic date ripple: delay one sprint, all dependent sprints shift" },
      { icon: MessageSquare, text: "Blocker tracking and escalation alerts for managers" },
      { icon: ClipboardList, text: "Variation Order management for post-contract changes" },
    ],
    gradient: "from-green-500/10 to-emerald-500/10",
  },
  {
    id: "finance",
    icon: Wallet,
    title: "Financial Management",
    description:
      "Track every rupee with project wallets, spending locks, and real-time profitability dashboards.",
    details: [
      { icon: DollarSign, text: "Per-project wallet with real-time balance tracking" },
      { icon: Lock, text: "Spending Lock: system blocks expenses when balance is insufficient" },
      { icon: CreditCard, text: "Milestone-based billing with Razorpay payment gateway" },
      { icon: PieChart, text: "Burn rate analysis and profitability margin alerts" },
      { icon: Receipt, text: "Vendor bill reconciliation with PO price variance detection" },
      { icon: BarChart3, text: "P&L reports per project with cost breakdown by category" },
    ],
    gradient: "from-purple-500/10 to-violet-500/10",
  },
  {
    id: "client-portal",
    icon: Monitor,
    title: "Client Portal",
    description:
      "Give your clients a transparent view of their project with their own login, payment access, and document library.",
    details: [
      { icon: Lock, text: "Separate client login with role-based visibility" },
      { icon: FolderKanban, text: "Real-time project progress tracking with sprint status" },
      { icon: CreditCard, text: "Online milestone payments via Razorpay/Stripe" },
      { icon: Camera, text: "Curated daily progress photo feed (manager-controlled visibility)" },
      { icon: FileText, text: "Document access: quotations, invoices, drawings, contracts" },
      { icon: MessageSquare, text: "Direct communication channel with the project team" },
    ],
    gradient: "from-pink-500/10 to-rose-500/10",
  },
  {
    id: "team",
    icon: UserCog,
    title: "Team Management",
    description:
      "Manage your entire workforce from designers to site supervisors with role-based access, attendance, and payroll.",
    details: [
      { icon: Shield, text: "Role-based access control: Admin, Manager, BDE, Sales, Supervisor, Client" },
      { icon: UserPlus, text: "Labor team management with skill levels and daily rates" },
      { icon: ClipboardList, text: "Digital attendance with mandatory site photos" },
      { icon: DollarSign, text: "Automated weekly payroll calculation by team and project" },
      { icon: BarChart3, text: "Performance analytics: cost per sqft, team efficiency metrics" },
      { icon: CalendarDays, text: "Contract labor milestone tracking and billing" },
    ],
    gradient: "from-teal-500/10 to-cyan-500/10",
  },
  {
    id: "integrations",
    icon: Plug,
    title: "Integrations & Automation",
    description:
      "Connect your workflows with the tools you already use for communication, payments, and coordination.",
    details: [
      { icon: MessageSquare, text: "WhatsApp notifications for lead updates and project milestones" },
      { icon: Mail, text: "Email automation: quotation delivery, payment receipts, approvals" },
      { icon: MapPin, text: "Google Maps integration for site location and visit planning" },
      { icon: Brain, text: "AI-powered floor plan analysis and room detection" },
      { icon: CreditCard, text: "Razorpay/Stripe payment gateway for online collections" },
      { icon: FileText, text: "PDF generation: quotations, purchase orders, tax invoices" },
    ],
    gradient: "from-indigo-500/10 to-blue-500/10",
  },
]

export default function FeaturesPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-background to-primary/5" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-4 font-serif text-4xl font-bold tracking-tight md:text-5xl">
              Features Built for{" "}
              <span className="bg-gradient-to-r from-gold to-amber-600 bg-clip-text text-transparent">
                Interior Design
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Every tool you need to manage leads, deliver projects, and grow
              your interior design business &mdash; all purpose-built for your
              workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Sections */}
      <div className="divide-y">
        {featureSections.map((section, idx) => (
          <section key={section.id} className="py-16 md:py-24">
            <div className="container mx-auto px-4">
              <div
                className={`grid items-center gap-12 lg:grid-cols-2 ${
                  idx % 2 === 1 ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Content Side */}
                <div className={idx % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
                    <section.icon className="h-6 w-6 text-gold" />
                  </div>
                  <h2 className="mb-3 font-serif text-2xl font-bold md:text-3xl">
                    {section.title}
                  </h2>
                  <p className="mb-8 text-muted-foreground">
                    {section.description}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {section.details.map((detail) => (
                      <div
                        key={detail.text}
                        className="flex items-start gap-3"
                      >
                        <detail.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                        <span className="text-sm">{detail.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Screenshot Placeholder Side */}
                <div className={idx % 2 === 1 ? "lg:order-1" : ""}>
                  <div
                    className={`flex aspect-[4/3] items-center justify-center rounded-2xl border bg-gradient-to-br ${section.gradient}`}
                  >
                    <div className="text-center">
                      <section.icon className="mx-auto mb-3 h-16 w-16 text-muted-foreground/30" />
                      <p className="text-sm font-medium text-muted-foreground/50">
                        {section.title} Screenshot
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <section className="border-t bg-muted/20 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">
            See All Features in Action
          </h2>
          <p className="mb-8 mx-auto max-w-xl text-muted-foreground">
            Start your free trial and explore every feature with sample data
            pre-loaded. No setup required.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login">
              <Button
                size="lg"
                className="bg-gold text-gold-foreground hover:bg-gold/90 px-8"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="px-8">
                Request a Demo
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              14-day free trial
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Full feature access
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

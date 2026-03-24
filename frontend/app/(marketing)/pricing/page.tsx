"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  X,
  Zap,
  Crown,
  Sparkles,
  Users,
  FolderKanban,
  HardDrive,
  MessageSquare,
  Brain,
  ChevronDown,
} from "lucide-react"
import { useState } from "react"

// ─── Plan data ──────────────────────────────────────────────

const plans = [
  {
    name: "Starter",
    tier: "STARTER",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    description: "For small studios getting started with project management.",
    icon: <Zap className="h-6 w-6" />,
    color: "text-blue-400",
    features: {
      users: "10 Team Members",
      projects: "10 Active Projects",
      leads: "500 Leads",
      storage: "5 GB Storage",
      whatsapp: true,
      ai: false,
    },
    highlight: false,
  },
  {
    name: "Pro",
    tier: "PRO",
    monthlyPrice: 2999,
    yearlyPrice: 29999,
    description: "For growing firms managing multiple projects at scale.",
    icon: <Crown className="h-6 w-6" />,
    color: "text-amber-400",
    features: {
      users: "25 Team Members",
      projects: "50 Active Projects",
      leads: "5,000 Leads",
      storage: "25 GB Storage",
      whatsapp: true,
      ai: true,
    },
    highlight: true,
  },
  {
    name: "Enterprise",
    tier: "ENTERPRISE",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For large organizations needing unlimited access and support.",
    icon: <Sparkles className="h-6 w-6" />,
    color: "text-purple-400",
    features: {
      users: "Unlimited Members",
      projects: "Unlimited Projects",
      leads: "Unlimited Leads",
      storage: "100 GB Storage",
      whatsapp: true,
      ai: true,
    },
    highlight: false,
  },
]

const comparisonFeatures = [
  { label: "Team Members", starter: "10", pro: "25", enterprise: "Unlimited" },
  { label: "Active Projects", starter: "10", pro: "50", enterprise: "Unlimited" },
  { label: "Lead Tracking", starter: "500", pro: "5,000", enterprise: "Unlimited" },
  { label: "File Storage", starter: "5 GB", pro: "25 GB", enterprise: "100 GB" },
  { label: "Quotation Builder", starter: true, pro: true, enterprise: true },
  { label: "Sprint-based Project Management", starter: true, pro: true, enterprise: true },
  { label: "Financial Tracking & Wallets", starter: true, pro: true, enterprise: true },
  { label: "Labor & Attendance Management", starter: true, pro: true, enterprise: true },
  { label: "Client Portal", starter: true, pro: true, enterprise: true },
  { label: "WhatsApp Integration", starter: true, pro: true, enterprise: true },
  { label: "AI-Powered Analysis", starter: false, pro: true, enterprise: true },
  { label: "Priority Support", starter: false, pro: true, enterprise: true },
  { label: "Custom Integrations", starter: false, pro: false, enterprise: true },
  { label: "Dedicated Account Manager", starter: false, pro: false, enterprise: true },
]

const faqs = [
  {
    q: "How does the 14-day free trial work?",
    a: "Sign up and get instant access to all Pro features for 14 days. No credit card required. At the end of the trial, choose a plan or continue on the Free tier with limited features.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you get instant access to new features. When downgrading, the change takes effect at the end of your current billing period.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit/debit cards, UPI, net banking, and wallets through our secure Razorpay payment gateway.",
  },
  {
    q: "Is there a contract or commitment?",
    a: "No long-term contracts. Monthly plans can be cancelled anytime. Yearly plans are billed annually with a 17% discount.",
  },
  {
    q: "What happens to my data if I downgrade?",
    a: "Your data is always safe. If you exceed the limits of a lower plan, you can still view existing data but won't be able to create new items until you're within limits.",
  },
]

// ─── Component ──────────────────────────────────────────────

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-24 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-6 text-lg text-white/60">
            Start with a 14-day free trial. No credit card required.
          </p>

          {/* Billing toggle */}
          <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-gold text-gold-foreground"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                billingCycle === "yearly"
                  ? "bg-gold text-gold-foreground"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative px-6 pb-24">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
          {plans.map((plan) => {
            const price =
              billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice

            return (
              <Card
                key={plan.tier}
                className={`relative border-white/10 bg-white/5 backdrop-blur-sm ${
                  plan.highlight
                    ? "ring-2 ring-gold/50 border-gold/30"
                    : ""
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gold text-gold-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className={plan.color}>{plan.icon}</div>
                  <CardTitle className="text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-white/50">
                    {plan.description}
                  </CardDescription>
                  <div className="pt-2">
                    {plan.tier === "ENTERPRISE" ? (
                      <p className="text-3xl font-bold text-white">Custom</p>
                    ) : (
                      <div>
                        <span className="text-4xl font-bold text-white">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(price)}
                        </span>
                        <span className="text-white/40">
                          /{billingCycle === "monthly" ? "mo" : "yr"}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm text-white/70">
                      <Users className="h-4 w-4 text-gold" />
                      {plan.features.users}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-white/70">
                      <FolderKanban className="h-4 w-4 text-gold" />
                      {plan.features.projects}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-white/70">
                      <HardDrive className="h-4 w-4 text-gold" />
                      {plan.features.storage}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-white/70">
                      {plan.features.whatsapp ? (
                        <MessageSquare className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-white/20" />
                      )}
                      WhatsApp Integration
                    </li>
                    <li className="flex items-center gap-2 text-sm text-white/70">
                      {plan.features.ai ? (
                        <Brain className="h-4 w-4 text-purple-400" />
                      ) : (
                        <X className="h-4 w-4 text-white/20" />
                      )}
                      AI-Powered Analysis
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  {plan.tier === "ENTERPRISE" ? (
                    <Button
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10"
                      asChild
                    >
                      <a href="mailto:sales@igolo.in">Contact Sales</a>
                    </Button>
                  ) : (
                    <Link href="/login" className="w-full">
                      <Button
                        className={`w-full ${
                          plan.highlight
                            ? "bg-gold text-gold-foreground hover:bg-gold/90"
                            : "bg-white/10 text-white hover:bg-white/20"
                        }`}
                      >
                        Start Free Trial
                      </Button>
                    </Link>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold text-white">
            Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 pr-6 text-white/50 font-medium">Feature</th>
                  <th className="pb-4 px-6 text-center text-blue-400 font-medium">Starter</th>
                  <th className="pb-4 px-6 text-center text-amber-400 font-medium">Pro</th>
                  <th className="pb-4 pl-6 text-center text-purple-400 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feat, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 pr-6 text-white/70">{feat.label}</td>
                    {(["starter", "pro", "enterprise"] as const).map((tier) => {
                      const val = feat[tier]
                      return (
                        <td key={tier} className="py-4 px-6 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="mx-auto h-5 w-5 text-green-400" />
                            ) : (
                              <X className="mx-auto h-5 w-5 text-white/20" />
                            )
                          ) : (
                            <span className="text-white/70">{val}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/10 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center font-serif text-3xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-white/5"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium text-white">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-white/40 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm text-white/60">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-serif text-3xl font-bold text-white">
            Ready to streamline your interior design business?
          </h2>
          <p className="mt-4 text-white/60">
            Start your 14-day free trial today. No credit card required.
          </p>
          <Link href="/login">
            <Button
              size="lg"
              className="mt-8 bg-gold text-gold-foreground hover:bg-gold/90"
            >
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}

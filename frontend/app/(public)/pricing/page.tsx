"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

// ════════════════════════════════════════
// TYPES
// ════════════════════════════════════════

type Currency = "INR" | "USD"
type BillingCycle = "monthly" | "quarterly" | "biannual" | "yearly"

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  badge?: string
  description: string
  monthlyPriceINR: number | null
  monthlyPriceUSD: number | null
  features: PlanFeature[]
  cta: string
  href: string
  highlighted: boolean
}

// ════════════════════════════════════════
// DATA
// ════════════════════════════════════════

const BILLING_CYCLES: { key: BillingCycle; label: string; discount: number }[] = [
  { key: "monthly", label: "Monthly", discount: 0 },
  { key: "quarterly", label: "3 Months", discount: 5 },
  { key: "biannual", label: "6 Months", discount: 10 },
  { key: "yearly", label: "Yearly", discount: 20 },
]

const plans: Plan[] = [
  {
    name: "Free / Starter",
    description: "For solo designers exploring the platform.",
    monthlyPriceINR: 0,
    monthlyPriceUSD: 0,
    features: [
      { text: "Up to 3 users", included: true },
      { text: "2 active projects", included: true },
      { text: "Basic lead management", included: true },
      { text: "Simple quotation builder", included: true },
      { text: "Email support", included: true },
    ],
    cta: "Get Started Free",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    badge: "Most Popular",
    description: "For growing studios managing multiple projects.",
    monthlyPriceINR: 7999,
    monthlyPriceUSD: 99,
    features: [
      { text: "Up to 25 users", included: true },
      { text: "Unlimited projects", included: true },
      { text: "Full CRM & lead pipeline", included: true },
      { text: "AI quotation builder", included: true },
      { text: "Sprint-based project management", included: true },
      { text: "Inventory & BOM tracking", included: true },
      { text: "Financial dashboards", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Start Free Trial",
    href: "/register?plan=pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For large firms with custom requirements.",
    monthlyPriceINR: null,
    monthlyPriceUSD: null,
    features: [
      { text: "Unlimited everything", included: true },
      { text: "Custom integrations", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "On-premise option", included: true },
      { text: "SLA guarantee", included: true },
      { text: "White-label option", included: true },
    ],
    cta: "Contact Sales",
    href: "/contact",
    highlighted: false,
  },
]

const faqs = [
  {
    question: "Is there really a free plan?",
    answer:
      "Yes. The Free / Starter plan is completely free with no time limit. You get up to 3 users and 2 active projects. Upgrade only when you need more capacity.",
  },
  {
    question: "How does the 14-day free trial work?",
    answer:
      "When you sign up for the Pro plan, you get a full 14-day trial with all features unlocked. No credit card is required to start. If you decide not to continue, your account automatically switches to the Free plan.",
  },
  {
    question: "Can I switch plans or cancel anytime?",
    answer:
      "Absolutely. You can upgrade, downgrade, or cancel your plan at any time from your account settings. When upgrading, you pay the prorated difference. When downgrading, the remaining balance is credited to your account.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards, UPI, net banking, and bank transfers for Indian customers. International customers can pay via credit card or PayPal.",
  },
  {
    question: "Do I get a discount for longer commitments?",
    answer:
      "Yes. Quarterly billing saves 5%, semi-annual saves 10%, and yearly billing saves 20% compared to monthly pricing. Toggle the billing period above to see exact prices.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your data is preserved for 30 days after cancellation, giving you time to export everything. After that, data is permanently deleted in accordance with our privacy policy.",
  },
]

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

function getPrice(
  plan: Plan,
  currency: Currency,
  cycle: BillingCycle
): { amount: number | null; period: string; perMonth: number | null } {
  const baseMonthly = currency === "INR" ? plan.monthlyPriceINR : plan.monthlyPriceUSD
  if (baseMonthly === null || baseMonthly === 0) {
    return { amount: baseMonthly, period: "month", perMonth: baseMonthly }
  }

  const discount = BILLING_CYCLES.find((b) => b.key === cycle)?.discount ?? 0
  const discountedMonthly = Math.round(baseMonthly * (1 - discount / 100))

  const multiplierMap: Record<BillingCycle, number> = {
    monthly: 1,
    quarterly: 3,
    biannual: 6,
    yearly: 12,
  }

  const periodLabelMap: Record<BillingCycle, string> = {
    monthly: "month",
    quarterly: "quarter",
    biannual: "6 months",
    yearly: "year",
  }

  const months = multiplierMap[cycle]
  const total = discountedMonthly * months

  return {
    amount: total,
    period: periodLabelMap[cycle],
    perMonth: cycle === "monthly" ? null : discountedMonthly,
  }
}

function formatPrice(amount: number, currency: Currency): string {
  if (amount === 0) return currency === "INR" ? "\u20B90" : "$0"
  if (currency === "INR") {
    return "\u20B9" + amount.toLocaleString("en-IN")
  }
  return "$" + amount.toLocaleString("en-US")
}

// ════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════

function CurrencyToggle({
  currency,
  onChange,
}: {
  currency: Currency
  onChange: (c: Currency) => void
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
      <button
        onClick={() => onChange("INR")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          currency === "INR"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        India (\u20B9)
      </button>
      <button
        onClick={() => onChange("USD")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
          currency === "USD"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        International ($)
      </button>
    </div>
  )
}

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle
  onChange: (c: BillingCycle) => void
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
      {BILLING_CYCLES.map((b) => (
        <button
          key={b.key}
          onClick={() => onChange(b.key)}
          className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
            cycle === b.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {b.label}
          {b.discount > 0 && (
            <span
              className={`ml-1.5 text-xs font-semibold ${
                cycle === b.key ? "text-teal-600" : "text-teal-500"
              }`}
            >
              -{b.discount}%
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function PricingCard({
  plan,
  currency,
  cycle,
}: {
  plan: Plan
  currency: Currency
  cycle: BillingCycle
}) {
  const pricing = getPrice(plan, currency, cycle)

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 transition-shadow ${
        plan.highlighted
          ? "border-teal-500 border-2 shadow-lg shadow-teal-500/10"
          : "border-gray-200 shadow-sm"
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-teal-600 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider">
            {plan.badge}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
        <p className="mt-1.5 text-sm text-gray-500">{plan.description}</p>
      </div>

      <div className="mb-8">
        {pricing.amount !== null ? (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-gray-900">
                {formatPrice(pricing.amount, currency)}
              </span>
              <span className="text-gray-500 text-sm">/{pricing.period}</span>
            </div>
            {pricing.perMonth !== null && (
              <p className="mt-1 text-xs text-gray-400">
                {formatPrice(pricing.perMonth, currency)}/month billed{" "}
                {cycle === "quarterly"
                  ? "quarterly"
                  : cycle === "biannual"
                    ? "semi-annually"
                    : "annually"}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-gray-900">Custom</span>
          </div>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature.text} className="flex items-start gap-3 text-sm">
            <Check
              className={`mt-0.5 h-4 w-4 shrink-0 ${
                feature.included ? "text-teal-600" : "text-gray-300"
              }`}
            />
            <span className={feature.included ? "text-gray-700" : "text-gray-400"}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <Link href={plan.href} className="mt-auto">
        <Button
          className={`w-full rounded-xl py-5 font-semibold transition-all ${
            plan.highlighted
              ? "bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/20"
              : "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          {plan.cta}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200">
      <button
        className="flex w-full items-center justify-between py-5 text-left"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-gray-900 pr-4">{question}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <div className="pb-5">
          <p className="text-sm leading-relaxed text-gray-500">{answer}</p>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════
// PAGE
// ════════════════════════════════════════

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("INR")
  const [cycle, setCycle] = useState<BillingCycle>("monthly")

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            Flexible Plans. Designed for{" "}
            <span className="text-teal-600">Interior Companies.</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Choose the features you need and save more with longer commitments.
          </p>

          {/* Toggles */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <CurrencyToggle currency={currency} onChange={setCurrency} />
            <BillingToggle cycle={cycle} onChange={setCycle} />
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} currency={currency} cycle={cycle} />
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-32 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="border-t border-gray-200">
            {faqs.map((faq) => (
              <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-24 text-center">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto mb-8">
              Talk to our team and find the perfect plan for your interior design business.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact">
                <Button className="rounded-xl bg-teal-600 px-8 py-5 text-base font-semibold text-white hover:bg-teal-700 shadow-md shadow-teal-600/20 transition-all">
                  Talk to Our Team
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="outline"
                  className="rounded-xl px-8 py-5 text-base font-semibold border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

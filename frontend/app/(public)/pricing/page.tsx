"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, ChevronDown, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

// ════════════════════════════════════════
// ANIMATION VARIANTS
// ════════════════════════════════════════

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// ════════════════════════════════════════
// DATA
// ════════════════════════════════════════

const plans = [
  {
    name: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    description: "Perfect for solo designers and small studios getting started.",
    features: [
      "10 Team Members",
      "10 Active Projects",
      "500 Leads",
      "5 GB Storage",
      "WhatsApp Notifications",
      "Email Support",
      "PDF Quotations",
      "Sprint Tracking",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: false,
  },
  {
    name: "Professional",
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    description: "For growing firms managing multiple projects simultaneously.",
    features: [
      "25 Team Members",
      "50 Active Projects",
      "5,000 Leads",
      "25 GB Storage",
      "WhatsApp Notifications",
      "AI Floor Plan Analysis",
      "Priority Email + Chat Support",
      "Advanced Reports",
      "Client Portal",
    ],
    cta: "Start Free Trial",
    href: "/register",
    popular: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    yearlyPrice: null,
    description: "For large firms with custom requirements and dedicated support.",
    features: [
      "Unlimited Team Members",
      "Unlimited Projects",
      "Unlimited Leads",
      "Unlimited Storage",
      "Dedicated Account Manager",
      "Custom Integrations",
      "On-premise Option",
      "SLA Guarantee",
    ],
    cta: "Contact Sales",
    href: "/contact",
    popular: false,
  },
]

const comparisonFeatures = [
  { name: "Team Members", starter: "10", pro: "25", enterprise: "Unlimited" },
  { name: "Active Projects", starter: "10", pro: "50", enterprise: "Unlimited" },
  { name: "Lead Management", starter: "500", pro: "5,000", enterprise: "Unlimited" },
  { name: "Storage", starter: "5 GB", pro: "25 GB", enterprise: "Unlimited" },
  { name: "PDF Quotations", starter: true, pro: true, enterprise: true },
  { name: "Sprint Tracking", starter: true, pro: true, enterprise: true },
  { name: "WhatsApp Notifications", starter: true, pro: true, enterprise: true },
  { name: "AI Floor Plan Analysis", starter: false, pro: true, enterprise: true },
  { name: "Client Portal", starter: false, pro: true, enterprise: true },
  { name: "Advanced Reports", starter: false, pro: true, enterprise: true },
  { name: "Custom Integrations", starter: false, pro: false, enterprise: true },
  { name: "Dedicated Account Manager", starter: false, pro: false, enterprise: true },
  { name: "On-premise Deployment", starter: false, pro: false, enterprise: true },
  { name: "SLA Guarantee", starter: false, pro: false, enterprise: true },
]

const faqs = [
  {
    question: "Can I switch plans later?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you will be charged the prorated difference. When downgrading, the remaining balance will be credited to your account.",
  },
  {
    question: "What happens after the 14-day free trial?",
    answer:
      "After your trial ends, you can choose a paid plan to continue using all features. Your data is preserved for 30 days after the trial expires, giving you time to decide.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No, there are no setup fees for the Starter and Professional plans. Enterprise plans may include onboarding and custom integration services that are quoted separately.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied, contact our support team within 30 days of your purchase for a full refund.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes, annual billing saves you approximately 17% compared to monthly billing. The yearly price is shown when you toggle to the annual billing option above.",
  },
]

// ════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════

function BillingToggle({
  isYearly,
  onToggle,
}: {
  isYearly: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      className="flex items-center justify-center gap-4 mt-8"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={2}
    >
      <span
        className={`text-sm font-medium ${!isYearly ? "text-white" : "text-gray-400"}`}
      >
        Monthly
      </span>
      <button
        onClick={onToggle}
        className="relative h-7 w-14 rounded-full bg-white/10 border border-white/10 transition-colors"
        aria-label="Toggle billing period"
      >
        <motion.div
          className="absolute top-0.5 h-6 w-6 rounded-full bg-[#CBB282]"
          animate={{ left: isYearly ? "calc(100% - 1.625rem)" : "0.125rem" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
      <span
        className={`text-sm font-medium ${isYearly ? "text-white" : "text-gray-400"}`}
      >
        Yearly
      </span>
      <span className="ml-1 inline-flex items-center rounded-full bg-[#CBB282]/15 px-3 py-0.5 text-xs font-semibold text-[#CBB282] border border-[#CBB282]/30">
        Save 17%
      </span>
    </motion.div>
  )
}

function PricingCard({
  plan,
  isYearly,
  index,
}: {
  plan: (typeof plans)[0]
  isYearly: boolean
  index: number
}) {
  const price = plan.monthlyPrice
    ? isYearly
      ? plan.yearlyPrice
      : plan.monthlyPrice
    : null

  return (
    <motion.div
      className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:border-[#CBB282]/40 hover:-translate-y-1 ${
        plan.popular
          ? "border-[#CBB282]/50 bg-white/[0.04] shadow-[0_0_40px_-12px_rgba(203,178,130,0.15)]"
          : "border-white/10 bg-white/[0.02]"
      }`}
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={index}
    >
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#CBB282] px-4 py-1 text-xs font-bold text-[#0B1120] uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
        <p className="mt-2 text-sm text-gray-400">{plan.description}</p>
      </div>

      <div className="mb-8">
        {price !== null ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-white">
              <span className="text-2xl">&#8377;</span>
              {price?.toLocaleString("en-IN")}
            </span>
            <span className="text-gray-400 text-sm">
              /{isYearly ? "year" : "month"}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-white">Custom</span>
          </div>
        )}
        {price !== null && isYearly && (
          <p className="mt-1 text-xs text-gray-500">
            Equivalent to &#8377;
            {Math.round(price / 12).toLocaleString("en-IN")}/month
          </p>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#CBB282]" />
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Link href={plan.href} className="mt-auto">
        <Button
          className={`w-full rounded-xl py-5 font-semibold transition-all duration-300 ${
            plan.popular
              ? "bg-[#CBB282] text-[#0B1120] hover:bg-[#b9a070] shadow-lg shadow-[#CBB282]/20"
              : "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20"
          }`}
        >
          {plan.cta}
        </Button>
      </Link>
    </motion.div>
  )
}

function ComparisonTable() {
  return (
    <motion.div
      className="mt-32"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={0}
    >
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        Feature Comparison
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-4 px-4 text-left text-sm font-medium text-gray-400 w-1/4">
                Feature
              </th>
              <th className="py-4 px-4 text-center text-sm font-medium text-gray-400 w-1/4">
                Starter
              </th>
              <th className="py-4 px-4 text-center text-sm font-medium text-[#CBB282] w-1/4">
                Professional
              </th>
              <th className="py-4 px-4 text-center text-sm font-medium text-gray-400 w-1/4">
                Enterprise
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonFeatures.map((feature, i) => (
              <tr
                key={feature.name}
                className={`border-b border-white/5 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}
              >
                <td className="py-3.5 px-4 text-sm text-gray-300">
                  {feature.name}
                </td>
                {(["starter", "pro", "enterprise"] as const).map((tier) => (
                  <td
                    key={tier}
                    className="py-3.5 px-4 text-center text-sm"
                  >
                    {typeof feature[tier] === "boolean" ? (
                      feature[tier] ? (
                        <Check className="h-4 w-4 text-[#CBB282] mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-gray-300">{feature[tier]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

function FAQItem({
  question,
  answer,
  index,
}: {
  question: string
  answer: string
  index: number
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      className="border-b border-white/10"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={index}
    >
      <button
        className="flex w-full items-center justify-between py-5 text-left"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="text-base font-medium text-white pr-4">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-gray-400">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FAQSection() {
  return (
    <motion.div
      className="mt-32 max-w-3xl mx-auto"
      variants={staggerContainer}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <h2 className="text-3xl font-bold text-white text-center mb-12">
        Frequently Asked Questions
      </h2>
      <div className="divide-y divide-white/10 border-t border-white/10">
        {faqs.map((faq, i) => (
          <FAQItem
            key={faq.question}
            question={faq.question}
            answer={faq.answer}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ════════════════════════════════════════
// PAGE
// ════════════════════════════════════════

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <motion.p
            className="inline-block text-sm font-medium tracking-wider uppercase text-[#CBB282] mb-4"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
          >
            Pricing
          </motion.p>
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
          >
            Plans that scale with{" "}
            <span className="text-[#CBB282]">your business</span>
          </motion.h1>
          <motion.p
            className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={2}
          >
            Start with a 14-day free trial. No credit card required. Upgrade
            when you are ready.
          </motion.p>

          <BillingToggle
            isYearly={isYearly}
            onToggle={() => setIsYearly(!isYearly)}
          />
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              isYearly={isYearly}
              index={i}
            />
          ))}
        </div>

        {/* Feature Comparison */}
        <ComparisonTable />

        {/* FAQ */}
        <FAQSection />

        {/* Bottom CTA */}
        <motion.div
          className="mt-32 text-center"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
        >
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Start your 14-day free trial today
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8">
              Join hundreds of interior design firms who manage their entire
              business with our platform. No credit card required.
            </p>
            <Link href="/register">
              <Button className="rounded-xl bg-[#CBB282] px-8 py-6 text-base font-semibold text-[#0B1120] hover:bg-[#b9a070] shadow-lg shadow-[#CBB282]/20 transition-all duration-300">
                Get Started Free
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

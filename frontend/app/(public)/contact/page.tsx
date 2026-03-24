"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building2,
  CheckCircle2,
  ChevronDown,
  Send,
  ArrowRight,
} from "lucide-react"

const helpOptions = [
  "General Inquiry",
  "Request Demo",
  "Enterprise Plan",
  "Technical Support",
  "Partnership",
]

const faqs = [
  {
    q: "What is Igolo Interior and who is it for?",
    a: "Igolo Interior is a SaaS ERP platform built specifically for interior design companies. It covers the entire project lifecycle from lead capture to handover, including quotations, project management, inventory, financials, and client portals.",
  },
  {
    q: "How long does it take to get started?",
    a: "Most teams are up and running within a day. Our onboarding wizard walks you through setting up your company profile, inventory, and team roles. No technical setup required.",
  },
  {
    q: "Can I import data from spreadsheets or other tools?",
    a: "Yes. We support CSV imports for inventory items, leads, and vendor data. Our support team can also assist with bulk migrations from legacy systems.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use industry-standard encryption at rest and in transit, role-based access controls, and regular automated backups. Enterprise customers can opt for dedicated infrastructure.",
  },
  {
    q: "Do you offer on-premise deployment?",
    a: "Yes, our Enterprise plan includes the option for on-premise or private cloud deployment with dedicated support and custom SLAs.",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
}

const inputClasses =
  "w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-[#CBB282] focus:ring-1 focus:ring-[#CBB282]/50 transition-colors"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="text-white">
      {/* Hero + Form Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Left Column: Contact Form */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={0}
            >
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Get in Touch
              </h1>
              <p className="text-lg text-gray-400 mb-10">
                Have questions about our platform? We&apos;d love to hear from
                you.
              </p>

              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-xl bg-white/5 border border-white/10 p-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 12,
                        delay: 0.2,
                      }}
                      className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#CBB282]/20"
                    >
                      <CheckCircle2 className="h-8 w-8 text-[#CBB282]" />
                    </motion.div>
                    <h2 className="text-2xl font-semibold mb-2">
                      Thank you for reaching out!
                    </h2>
                    <p className="text-gray-400">
                      We&apos;ll get back to you within 24 hours.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-300 mb-1.5"
                        >
                          Full Name <span className="text-[#CBB282]">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          required
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-300 mb-1.5"
                        >
                          Email <span className="text-[#CBB282]">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          required
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor="company"
                          className="block text-sm font-medium text-gray-300 mb-1.5"
                        >
                          Company Name
                        </label>
                        <input
                          id="company"
                          type="text"
                          placeholder="Your company"
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium text-gray-300 mb-1.5"
                        >
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="help"
                        className="block text-sm font-medium text-gray-300 mb-1.5"
                      >
                        How can we help?
                      </label>
                      <select id="help" className={inputClasses}>
                        <option value="" className="bg-[#0B1120]">
                          Select a topic
                        </option>
                        {helpOptions.map((opt) => (
                          <option
                            key={opt}
                            value={opt}
                            className="bg-[#0B1120]"
                          >
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-gray-300 mb-1.5"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={5}
                        placeholder="Tell us about your requirements..."
                        className={inputClasses + " resize-none"}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#CBB282] px-6 py-3.5 text-sm font-semibold text-[#0B1120] hover:bg-[#b89e6e] transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      Send Message
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Column: Contact Info + Cards */}
            <div className="space-y-6">
              {/* Contact Info Card */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={1}
                className="rounded-xl bg-white/5 border border-white/10 p-6"
              >
                <h3 className="text-lg font-semibold mb-5">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-[#CBB282] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <a
                        href="mailto:hello@igolo.in"
                        className="text-white hover:text-[#CBB282] transition-colors"
                      >
                        hello@igolo.in
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-[#CBB282] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Phone</p>
                      <a
                        href="tel:+918045678900"
                        className="text-white hover:text-[#CBB282] transition-colors"
                      >
                        +91 80 4567 8900
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-[#CBB282] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-400">Office</p>
                      <p className="text-white">
                        Igolo Interior Technologies, WeWork Galaxy, Residency
                        Road, Bangalore 560025
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Book a Demo Card */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={2}
                className="rounded-xl bg-white/5 border border-white/10 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#CBB282]/20">
                    <Calendar className="h-5 w-5 text-[#CBB282]" />
                  </div>
                  <h3 className="text-lg font-semibold">Book a Demo</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  See the platform in action. Our team will walk you through
                  every feature.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#CBB282] px-5 py-2.5 text-sm font-semibold text-[#0B1120] hover:bg-[#b89e6e] transition-colors"
                >
                  Schedule Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              {/* Enterprise Card */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={3}
                className="rounded-xl bg-white/5 border border-white/10 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#CBB282]/20">
                    <Building2 className="h-5 w-5 text-[#CBB282]" />
                  </div>
                  <h3 className="text-lg font-semibold">Enterprise?</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Need custom integrations, on-premise deployment, or dedicated
                  support?
                </p>
                <a
                  href="mailto:enterprise@igolo.in"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#CBB282] px-5 py-2.5 text-sm font-semibold text-[#CBB282] hover:bg-[#CBB282]/10 transition-colors"
                >
                  Talk to Enterprise Sales
                  <ArrowRight className="h-4 w-4" />
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-400 text-lg">
              Everything you need to know about the platform.
            </p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i * 0.5}
                className="rounded-xl bg-white/5 border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-4 text-gray-400 text-sm leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <p className="text-[#CBB282] font-medium mb-3 text-sm tracking-wide uppercase">
              Trusted by professionals
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Join 500+ interior design companies
            </h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
              Streamline your operations, delight your clients, and grow your
              business with Igolo Interior.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-[#CBB282] px-8 py-3.5 text-sm font-semibold text-[#0B1120] hover:bg-[#b89e6e] transition-colors"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

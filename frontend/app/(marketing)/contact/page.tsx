"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Player } from "@remotion/player"
import { TextGenerateEffect } from "@/components/ui/aceternity/text-generate-effect"
import { ContactParticles } from "@/components/remotion/compositions/contact-particles"
import { MapPin, Phone, Mail, Clock, ChevronDown, Send, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const contactInfo = [
  {
    icon: <MapPin className="h-5 w-5" />,
    title: "Office Address",
    value: "Bangalore, Karnataka, India",
    detail: "Koramangala, 5th Block",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    title: "Phone",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Email",
    value: "hello@igolointerior.com",
    href: "mailto:hello@igolointerior.com",
  },
]

const faqs = [
  {
    question: "How long does a typical interior design project take?",
    answer:
      "A standard residential project takes 8-12 weeks from design to handover. This includes 2 weeks for design & approvals, 2 weeks for material procurement, and 4-8 weeks for execution. Complex projects or larger commercial spaces may take 16-20 weeks.",
  },
  {
    question: "What is the typical budget range for your services?",
    answer:
      "Our residential projects typically start at INR 8-10 lakhs for a 2BHK apartment and go up based on scope and material choices. We provide a detailed quotation breakdown (room by room) before any commitment, ensuring complete transparency.",
  },
  {
    question: "What's included in your design package?",
    answer:
      "Our comprehensive package includes: site measurement, 2D layouts, 3D photorealistic renders, material selection assistance, project management, on-site supervision, and final handover with warranty. We handle everything from concept to completion.",
  },
  {
    question: "What is your design process?",
    answer:
      "We follow a structured 6-phase process: 1) Initial consultation & requirement gathering, 2) Concept design & mood boards, 3) Detailed drawings & 3D renders, 4) Material procurement, 5) On-site execution with weekly updates, 6) Final walkthrough & handover.",
  },
  {
    question: "Do you offer any warranty on your work?",
    answer:
      "Yes! We provide a 1-year comprehensive warranty on all workmanship and a 5-10 year warranty on materials depending on the manufacturer. Any issues within the warranty period are resolved at no additional cost.",
  },
]

const serviceOptions = [
  "Interior Design",
  "Architecture",
  "3D Visualization",
  "Space Planning",
  "Renovation",
  "Consultation",
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/5"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="font-medium text-white/80 pr-4">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-gold/60" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm leading-relaxed text-white/50">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const particleInputProps = useMemo(() => ({}), [])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Invalid email"
    if (!formData.message.trim()) newErrors.message = "Message is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitted(true)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative pt-16">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <TextGenerateEffect
            words="Let's Create Something Beautiful"
            className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/60"
          >
            Ready to transform your space? Get in touch and let&apos;s discuss
            your vision.
          </motion.p>
        </div>
      </section>

      {/* Main Content: Form + Info */}
      <section className="relative bg-[#0B1120] pb-24">
        {/* Subtle particle background */}
        <div className="absolute inset-0 z-0 opacity-20">
          <Player
            component={ContactParticles}
            inputProps={particleInputProps}
            durationInFrames={300}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            autoPlay
            loop
            acknowledgeRemotionLicense
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Left: Contact Form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-gold/10 bg-[#111827]/80 p-8 backdrop-blur-sm">
                <h2 className="font-serif text-2xl font-bold text-white">Send Us a Message</h2>
                <p className="mt-2 text-sm text-white/40">
                  We&apos;ll get back to you within 24 hours.
                </p>

                <AnimatePresence mode="wait">
                  {isSubmitted ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 flex flex-col items-center py-12 text-center"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle2 className="h-8 w-8 text-green-400" />
                      </div>
                      <h3 className="mt-4 font-serif text-xl font-semibold text-white">
                        Message Sent!
                      </h3>
                      <p className="mt-2 text-sm text-white/50">
                        Thank you for reaching out. Our team will contact you within 24 hours.
                      </p>
                      <Button
                        onClick={() => {
                          setIsSubmitted(false)
                          setFormData({ name: "", email: "", phone: "", service: "", message: "" })
                        }}
                        variant="outline"
                        className="mt-6 border-gold/30 text-gold hover:bg-gold/10"
                      >
                        Send Another Message
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onSubmit={handleSubmit}
                      className="mt-8 space-y-5"
                    >
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-white/50">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
                            placeholder="Your name"
                          />
                          {errors.name && (
                            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                          )}
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-white/50">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
                            placeholder="you@email.com"
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-white/50">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-white/50">
                            Service Interested In
                          </label>
                          <select
                            value={formData.service}
                            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
                          >
                            <option value="" className="bg-[#111827]">Select a service</option>
                            {serviceOptions.map((opt) => (
                              <option key={opt} value={opt} className="bg-[#111827]">
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-white/50">
                          Your Message *
                        </label>
                        <textarea
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          rows={5}
                          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-gold/40 focus:ring-1 focus:ring-gold/20"
                          placeholder="Tell us about your project..."
                        />
                        {errors.message && (
                          <p className="mt-1 text-xs text-red-400">{errors.message}</p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90 sm:w-auto"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right: Contact Info */}
            <div className="space-y-6 lg:col-span-2">
              {contactInfo.map((info, i) => (
                <motion.div
                  key={info.title}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group rounded-xl border border-gold/10 bg-[#111827]/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-gold/25"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/60">{info.title}</h3>
                      {info.href ? (
                        <a href={info.href} className="mt-0.5 block text-white transition-colors hover:text-gold">
                          {info.value}
                        </a>
                      ) : (
                        <p className="mt-0.5 text-white">{info.value}</p>
                      )}
                      {info.detail && (
                        <p className="mt-0.5 text-xs text-white/30">{info.detail}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Business Hours */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="rounded-xl border border-gold/10 bg-[#111827]/80 p-6 backdrop-blur-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-white/60">Business Hours</h3>
                    <p className="mt-0.5 text-white">Mon - Sat: 10:00 AM - 7:00 PM</p>
                    <p className="mt-0.5 text-xs text-white/30">Sunday: By appointment only</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-gold/10 bg-[#080D19] py-24">
        <div className="mx-auto max-w-3xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
              Common Questions
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold text-white">
              Frequently Asked Questions
            </h2>
            <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
          </motion.div>

          <div>
            {faqs.map((faq, i) => (
              <FAQItem key={i} faq={faq} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

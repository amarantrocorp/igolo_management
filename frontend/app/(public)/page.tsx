"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { Player, PlayerRef } from "@remotion/player"
import { TextGenerateEffect } from "@/components/ui/aceternity/text-generate-effect"
import { InfiniteMovingCards } from "@/components/ui/aceternity/infinite-moving-cards"
import { StatsCounter } from "@/components/remotion/compositions/stats-counter"
import { ParticleField } from "@/components/remotion/compositions/particle-field"
import { BlueprintScroll } from "@/components/remotion/compositions/blueprint-scroll"
import { HeroPlayer } from "@/components/remotion/players/hero-player"
import {
  Sparkles,
  ArrowRight,
  ChevronDown,
  Paintbrush,
  Building2,
  Layers,
  Ruler,
  Home,
  MessageSquare,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ════════════════════════════════════════
// DATA
// ════════════════════════════════════════

const services = [
  {
    title: "Smart CRM & Pipeline",
    description: "Capture leads from any source, track them through a visual Kanban pipeline, and convert qualified prospects into projects automatically.",
    icon: <Paintbrush className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
  {
    title: "AI-Powered Quotations",
    description: "Build room-by-room quotations with auto-calculated pricing, version history, and professional PDF generation. AI analyzes floor plans to auto-populate rooms.",
    icon: <Building2 className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
  },
  {
    title: "Sprint-Based Execution",
    description: "Six standardized project phases from Design to Handover. Gantt charts, daily site logs with photos, and automatic timeline cascading when delays occur.",
    icon: <Layers className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&q=80",
  },
  {
    title: "Financial Controls",
    description: "Per-project wallets with spending locks, milestone billing, Razorpay integration for online payments, and real-time profitability tracking.",
    icon: <Ruler className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1554224154-22dec7ec8818?w=800&q=80",
  },
  {
    title: "Inventory & Procurement",
    description: "Track materials across warehouses, create purchase orders for vendors, manage goods receiving, and auto-update pricing from bills.",
    icon: <Home className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  },
  {
    title: "Client Portal",
    description: "Give clients their own login to track project progress, view sprints, make payments online, and access documents — all branded to your company.",
    icon: <MessageSquare className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  },
]

const stats = [
  { value: 500, suffix: "+", label: "Companies Onboarded" },
  { value: 15000, suffix: "+", label: "Projects Managed" },
  { value: 98, suffix: "%", label: "Client Satisfaction" },
  { value: 50, suffix: "Cr+", label: "Revenue Tracked" },
]

const portfolio = [
  {
    before: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    after: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
    title: "Lead Pipeline Dashboard",
    category: "CRM",
  },
  {
    before: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
    after: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&q=80",
    title: "Quotation Builder",
    category: "Sales",
  },
  {
    before: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
    after: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
    title: "Project Execution",
    category: "Operations",
  },
]

const testimonials = [
  {
    quote: "We reduced our quotation time from 3 days to 30 minutes. The auto-pricing engine is a game changer.",
    name: "Priya Sharma",
    title: "Founder, DesignCraft Interiors, Bangalore",
  },
  {
    quote: "The financial controls saved us from bleeding money. We can see exactly where every rupee goes across all our projects.",
    name: "Vikram Mehta",
    title: "CEO, Urban Nest Studios, Mumbai",
  },
  {
    quote: "Our clients love the portal. They can track progress, see photos, and pay online. No more WhatsApp chaos.",
    name: "Anita Desai",
    title: "Director, Livespace Interiors, Delhi",
  },
  {
    quote: "Managing 12 concurrent projects was impossible before. The sprint system and Gantt charts changed everything.",
    name: "Rajesh Kumar",
    title: "Operations Head, HomeStyle Co, Pune",
  },
  {
    quote: "The AI floor plan analysis is incredible. Upload a blueprint and the system creates a complete quotation in minutes.",
    name: "Meera Joshi",
    title: "Lead Designer, Artisan Interiors, Hyderabad",
  },
]

const processSteps = [
  { phase: "Capture & Qualify", desc: "Leads flow in from your website, ads, and referrals. The CRM auto-assigns and tracks every interaction." },
  { phase: "Quote & Convert", desc: "Build detailed room-by-room quotations with live pricing. Send professional PDFs and convert leads to projects." },
  { phase: "Execute & Track", desc: "Six standardized sprints guide your team from civil work to handover. Daily logs, Gantt charts, and spending locks keep everything on track." },
  { phase: "Handover & Grow", desc: "Deliver projects on time, collect final payments through the client portal, and use analytics to grow your business." },
]

// ════════════════════════════════════════
// COMPONENTS
// ════════════════════════════════════════

function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <HeroPlayer />
      </div>
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-32">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm text-gold backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Built for Interior Design Companies
            </div>
          </motion.div>

          <TextGenerateEffect
            words="The Operating System for Interior Design Companies"
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-6 max-w-lg text-lg text-white/70"
          >
            From lead capture to project handover — manage quotations, sprints,
            finances, inventory, and client communication in one powerful platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Link href="/register">
              <Button
                size="lg"
                className="group bg-gold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90 hover:shadow-gold/30"
              >
                Start Your Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Watch Demo
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
            className="mt-4 text-sm text-white/40"
          >
            14-day free trial &bull; No credit card required &bull; Setup in 2 minutes
          </motion.p>
        </div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="h-6 w-6 text-gold/60" />
      </motion.div>
    </section>
  )
}

function StatsSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.3 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const inputPropsArray = useMemo(() =>
    stats.map((s) => ({ value: s.value, label: s.label, suffix: s.suffix })),
    []
  )

  return (
    <section ref={sectionRef} className="relative border-y border-gold/10 bg-[#0B1120] py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="flex flex-col items-center"
          >
            <div className="h-[160px] w-[160px]">
              {isVisible && (
                <Player
                  component={StatsCounter}
                  inputProps={inputPropsArray[i]}
                  durationInFrames={120}
                  compositionWidth={400}
                  compositionHeight={400}
                  fps={30}
                  autoPlay
                  acknowledgeRemotionLicense
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section id="services" className="relative bg-[#0B1120] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
            Everything You Need
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            Platform Capabilities
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[22rem]">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className={`group relative overflow-hidden rounded-xl border border-gold/10 bg-[#111827] shadow-lg transition-all duration-300 hover:border-gold/30 hover:shadow-gold/5 ${
                i === 0 || i === 3 ? "md:col-span-2" : ""
              }`}
            >
              <div className="absolute inset-0">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover opacity-15 transition-all duration-500 group-hover:opacity-25 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/80 to-[#111827]/40" />
              </div>
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative flex h-full flex-col justify-end p-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold backdrop-blur-sm transition-colors group-hover:bg-gold/20">
                  {service.icon}
                </div>
                <div className="font-serif text-lg font-semibold text-white">
                  {service.title}
                </div>
                <div className="mt-2 text-sm text-white/50 transition-colors group-hover:text-white/70">
                  {service.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/register">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
              Explore All Features
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function PortfolioCard({ item, index }: { item: typeof portfolio[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={item.before}
        alt={`${item.title} before`}
        fill
        className="object-cover transition-all duration-700 group-hover:scale-105"
        style={{ filter: isHovered ? "grayscale(0.8) brightness(0.6)" : "grayscale(0.3) brightness(0.9)" }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{
          clipPath: isHovered ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
        }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Image
          src={item.after}
          alt={`${item.title} after`}
          fill
          className="object-cover"
        />
      </motion.div>
      <motion.div
        className="absolute top-0 bottom-0 z-10 w-[3px]"
        style={{
          background: "linear-gradient(180deg, transparent, #CBB282, #E8D5B7, #CBB282, transparent)",
          boxShadow: "0 0 15px rgba(203, 178, 130, 0.5), 0 0 30px rgba(203, 178, 130, 0.2)",
        }}
        animate={{
          left: isHovered ? "100%" : "0%",
        }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      />
      <motion.div
        className="absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-5"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <span className="text-xs font-medium uppercase tracking-wider text-gold">
          {item.category}
        </span>
        <h3 className="mt-1 font-serif text-lg font-semibold text-white">
          {item.title}
        </h3>
        <span className="mt-1 text-xs text-white/50">Hover to reveal transformation</span>
      </motion.div>
      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        <motion.span
          className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase text-white backdrop-blur-sm"
          animate={{ opacity: isHovered ? 0.5 : 1 }}
        >
          Before
        </motion.span>
        <motion.span
          className="rounded-full bg-gold/30 px-2 py-0.5 text-[10px] font-medium uppercase text-gold backdrop-blur-sm"
          animate={{ opacity: isHovered ? 1 : 0.3 }}
        >
          After
        </motion.span>
      </div>
    </motion.div>
  )
}

function PortfolioSection() {
  return (
    <section id="portfolio" className="bg-[#0B1120] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
            See It In Action
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            Platform Screenshots
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="mt-4 text-white/50">
            Hover over each screen to explore the interface
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.map((item, i) => (
            <PortfolioCard key={item.title} item={item} index={i} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/register">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
              Try It Yourself
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function ProcessSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<PlayerRef>(null)
  const totalFrames = 600

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  })

  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (progress) => {
      const frame = Math.round(progress * (totalFrames - 1))
      playerRef.current?.seekTo(frame)
    })
    return unsubscribe
  }, [scrollYProgress, totalFrames])

  const [activeStep, setActiveStep] = useState(0)
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (progress) => {
      const step = Math.min(Math.floor(progress * 4), 3)
      setActiveStep(step)
    })
    return unsubscribe
  }, [scrollYProgress])

  const blueprintInputProps = useMemo(() => ({}), [])

  return (
    <section id="process" ref={containerRef} className="relative bg-[#080D19]" style={{ height: "300vh" }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-6 lg:grid-cols-5">
          <div className="flex flex-col justify-center lg:col-span-2">
            <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
              Our Process
            </span>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
              The Blueprint
            </h2>
            <div className="mt-2 h-px w-16 bg-gold/50" />

            <div className="mt-8 space-y-6">
              {processSteps.map((step, i) => (
                <motion.div
                  key={step.phase}
                  animate={{
                    opacity: activeStep === i ? 1 : 0.3,
                    x: activeStep === i ? 0 : -10,
                  }}
                  transition={{ duration: 0.4 }}
                  className="border-l-2 pl-4"
                  style={{
                    borderColor: activeStep === i ? "#CBB282" : "rgba(203,178,130,0.15)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gold/60">0{i + 1}</span>
                    <h3 className="font-serif text-lg font-semibold text-white">
                      {step.phase}
                    </h3>
                  </div>
                  <AnimatePresence>
                    {activeStep === i && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-2 text-sm text-white/50"
                      >
                        {step.desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 flex gap-2">
              {processSteps.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: activeStep === i ? 24 : 8,
                    backgroundColor: activeStep >= i ? "#CBB282" : "rgba(203,178,130,0.2)",
                  }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center lg:col-span-3">
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-gold/10 shadow-2xl shadow-gold/5">
              <Player
                ref={playerRef}
                component={BlueprintScroll}
                inputProps={blueprintInputProps}
                durationInFrames={totalFrames}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                acknowledgeRemotionLicense
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-[#0B1120] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
            Trusted by Industry Leaders
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            What Our Customers Say
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
        </motion.div>
      </div>

      <InfiniteMovingCards
        items={testimonials}
        direction="right"
        speed="slow"
      />
    </section>
  )
}

function CTASection() {
  const inputProps = useMemo(() => ({}), [])

  return (
    <section className="relative overflow-hidden py-32">
      <div className="absolute inset-0 z-0">
        <Player
          component={ParticleField}
          inputProps={inputProps}
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

      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            Start Managing Your Interior Business Better
          </h2>
          <p className="mt-6 text-lg text-white/60">
            Join hundreds of interior design companies already using our platform
            to streamline operations and grow their business.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="group bg-gold text-gold-foreground shadow-lg shadow-gold/25 hover:bg-gold/90 hover:shadow-gold/40"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Talk to Sales
              </Button>
            </Link>
          </div>
        </motion.div>
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
      <StatsSection />
      <ServicesSection />
      <PortfolioSection />
      <ProcessSection />
      <TestimonialsSection />
      <CTASection />
    </>
  )
}

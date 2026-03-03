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
    title: "Interior Design",
    description: "Complete end-to-end design solutions from concept to execution, tailored to your lifestyle.",
    icon: <Paintbrush className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
  },
  {
    title: "Architecture",
    description: "Spatial planning and structural design that maximizes functionality with stunning flow.",
    icon: <Building2 className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    title: "3D Visualization",
    description: "Photo-realistic 3D renders that bring your dream space to life before construction begins.",
    icon: <Layers className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  },
  {
    title: "Space Planning",
    description: "Optimized layouts that balance aesthetics with ergonomics, making every square foot count.",
    icon: <Ruler className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
  },
  {
    title: "Renovation",
    description: "Transform existing spaces with modern upgrades, from kitchen remodels to complete makeovers.",
    icon: <Home className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
  },
  {
    title: "Consultation",
    description: "Expert guidance on materials, color palettes, lighting, and furnishings to elevate your space.",
    icon: <MessageSquare className="h-6 w-6" />,
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
  },
]

const stats = [
  { value: 200, suffix: "+", label: "Projects Delivered" },
  { value: 98, suffix: "%", label: "Client Satisfaction" },
  { value: 15, suffix: "+", label: "Years Experience" },
  { value: 50, suffix: "+", label: "Design Awards" },
]

const portfolio = [
  {
    before: "https://images.unsplash.com/photo-1564078516393-cf04bd96e2d8?w=800&q=80",
    after: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    title: "Modern Living Room",
    category: "Residential",
  },
  {
    before: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80",
    after: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    title: "Luxury Kitchen",
    category: "Kitchen Design",
  },
  {
    before: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    after: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
    title: "Master Bedroom",
    category: "Bedroom",
  },
  {
    before: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    after: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80",
    title: "Executive Office",
    category: "Commercial",
  },
  {
    before: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    after: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
    title: "Minimalist Dining",
    category: "Dining Room",
  },
  {
    before: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80",
    after: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    title: "Spa Bathroom",
    category: "Bathroom",
  },
]

const testimonials = [
  {
    quote: "Igolo Interior transformed our 3BHK into something straight out of a magazine. The attention to detail was extraordinary.",
    name: "Priya Sharma",
    title: "Homeowner, Whitefield",
  },
  {
    quote: "Professional, on-time, and within budget. They managed everything from design to final handover flawlessly.",
    name: "Rajesh Kumar",
    title: "Villa Owner, HSR Layout",
  },
  {
    quote: "The 3D renders they showed us were almost identical to the final result. Truly impressive craftsmanship.",
    name: "Anita Desai",
    title: "Apartment Owner, Koramangala",
  },
  {
    quote: "Our office space went from dull to dynamic. Employee satisfaction has visibly improved since the redesign.",
    name: "Vikram Mehta",
    title: "CEO, TechStart Solutions",
  },
  {
    quote: "They understood our vision perfectly and added their own creative touches that elevated the entire project.",
    name: "Sneha Reddy",
    title: "Homeowner, Indiranagar",
  },
]

const processSteps = [
  { phase: "Design & Planning", desc: "We start with your vision — understanding your lifestyle, preferences, and dreams for the space." },
  { phase: "Technical Drawing", desc: "Every detail measured, every angle calculated. Our blueprints leave nothing to chance." },
  { phase: "Material Selection", desc: "Premium choices, curated for you. From Italian marble to Japanese hardware — only the finest." },
  { phase: "Execution & Handover", desc: "Bringing it all to life with precision craftsmanship and meticulous project management." },
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
              Premium Interior Design
            </div>
          </motion.div>

          <TextGenerateEffect
            words="Crafting Spaces That Inspire Living"
            className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-6 max-w-lg text-lg text-white/70"
          >
            From concept to completion, we transform ordinary spaces into
            extraordinary experiences. Every detail curated, every corner perfected.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Link href="/contact">
              <Button
                size="lg"
                className="group bg-gold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90 hover:shadow-gold/30"
              >
                Start Your Project
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                View Our Work
              </Button>
            </Link>
          </motion.div>
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
            What We Create
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            Our Services
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
          <Link href="/services">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
              View All Services
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
            Our Transformations
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            Portfolio
          </h2>
          <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <p className="mt-4 text-white/50">
            Hover over each project to reveal the transformation
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.map((item, i) => (
            <PortfolioCard key={item.title} item={item} index={i} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/portfolio">
            <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
              View Full Portfolio
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
            Client Stories
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
            What Our Clients Say
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
            Your Dream Space Awaits
          </h2>
          <p className="mt-6 text-lg text-white/60">
            Let us bring your vision to life. Schedule a consultation
            and take the first step toward your dream interior.
          </p>
          <div className="mt-10">
            <Link href="/contact">
              <Button
                size="lg"
                className="group bg-gold text-gold-foreground shadow-lg shadow-gold/25 hover:bg-gold/90 hover:shadow-gold/40"
              >
                Get In Touch
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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

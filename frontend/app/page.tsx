"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { TextGenerateEffect } from "@/components/ui/aceternity/text-generate-effect"
import { InfiniteMovingCards } from "@/components/ui/aceternity/infinite-moving-cards"
import {
  Paintbrush,
  Ruler,
  MessageSquare,
  Home,
  ArrowRight,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

// ---- Data ----

const services = [
  {
    title: "Interior Design",
    description:
      "Complete end-to-end design solutions from concept to execution, tailored to your unique lifestyle and taste.",
    icon: <Paintbrush className="h-6 w-6 text-gold" />,
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
  },
  {
    title: "Architecture",
    description:
      "Spatial planning and structural design that maximizes functionality while creating stunning visual flow.",
    icon: <Building2 className="h-6 w-6 text-gold" />,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  },
  {
    title: "3D Visualization",
    description:
      "Photo-realistic 3D renders that bring your dream space to life before a single nail is hammered.",
    icon: <Layers className="h-6 w-6 text-gold" />,
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  },
  {
    title: "Space Planning",
    description:
      "Optimized layouts that balance aesthetics with ergonomics, making every square foot count.",
    icon: <Ruler className="h-6 w-6 text-gold" />,
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
  },
  {
    title: "Renovation",
    description:
      "Transform existing spaces with modern upgrades, from kitchen remodels to complete home makeovers.",
    icon: <Home className="h-6 w-6 text-gold" />,
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
  },
  {
    title: "Consultation",
    description:
      "Expert guidance on materials, color palettes, lighting, and furnishings to elevate your space.",
    icon: <MessageSquare className="h-6 w-6 text-gold" />,
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
  },
]

const testimonials = [
  {
    quote:
      "Igolo Interior transformed our 3BHK into something straight out of a magazine. The attention to detail was extraordinary.",
    name: "Priya Sharma",
    title: "Homeowner, Whitefield",
  },
  {
    quote:
      "Professional, on-time, and within budget. They managed everything from design to final handover flawlessly.",
    name: "Rajesh Kumar",
    title: "Villa Owner, HSR Layout",
  },
  {
    quote:
      "The 3D renders they showed us were almost identical to the final result. Truly impressive craftsmanship.",
    name: "Anita Desai",
    title: "Apartment Owner, Koramangala",
  },
  {
    quote:
      "Our office space went from dull to dynamic. Employee satisfaction has visibly improved since the redesign.",
    name: "Vikram Mehta",
    title: "CEO, TechStart Solutions",
  },
  {
    quote:
      "They understood our vision perfectly and added their own creative touches that elevated the entire project.",
    name: "Sneha Reddy",
    title: "Homeowner, Indiranagar",
  },
]

const stats = [
  { value: "200+", label: "Projects Delivered" },
  { value: "98%", label: "Client Satisfaction" },
  { value: "15+", label: "Years Experience" },
  { value: "50+", label: "Design Awards" },
]

const portfolio = [
  {
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    title: "Modern Living Room",
    category: "Residential",
  },
  {
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    title: "Luxury Kitchen",
    category: "Kitchen Design",
  },
  {
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
    title: "Master Bedroom",
    category: "Bedroom",
  },
  {
    image: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80",
    title: "Executive Office",
    category: "Commercial",
  },
  {
    image: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
    title: "Minimalist Dining",
    category: "Dining Room",
  },
  {
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    title: "Spa Bathroom",
    category: "Bathroom",
  },
]

// ---- Components ----

function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-gold" />
          <span className="font-serif text-xl font-bold tracking-tight">
            Igolo Interior
          </span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#services" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Services
          </a>
          <a href="#portfolio" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Portfolio
          </a>
          <a href="#testimonials" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Testimonials
          </a>
          <a href="#stats" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            About
          </a>
          <Link href="/login">
            <Button size="sm" className="bg-gold text-gold-foreground hover:bg-gold/90">
              Client Portal
            </Button>
          </Link>
        </div>
        <Link href="/login" className="md:hidden">
          <Button size="sm" variant="outline">
            Login
          </Button>
        </Link>
      </div>
    </motion.nav>
  )
}

function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-[120px]" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        {/* Left: Text */}
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-sm text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              Premium Interior Design
            </div>
          </motion.div>

          <TextGenerateEffect
            words="Crafting Spaces That Inspire Living"
            className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl"
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-6 max-w-lg text-lg text-muted-foreground"
          >
            From concept to completion, we transform ordinary spaces into
            extraordinary experiences. Every detail curated, every corner
            perfected.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Link href="/login">
              <Button
                size="lg"
                className="group bg-gold text-gold-foreground hover:bg-gold/90"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <a href="#services">
              <Button size="lg" variant="outline">
                Explore Services
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Right: Image Collage */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80"
                  alt="Modern interior design living room"
                  width={600}
                  height={400}
                  className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80"
                  alt="Luxury bedroom interior"
                  width={600}
                  height={300}
                  className="h-44 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80"
                  alt="Contemporary kitchen design"
                  width={600}
                  height={300}
                  className="h-44 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="overflow-hidden rounded-2xl shadow-2xl">
                <Image
                  src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80"
                  alt="Elegant dining room"
                  width={600}
                  height={400}
                  className="h-64 w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            </div>
          </div>
          {/* Floating accent */}
          <div className="absolute -bottom-4 -left-4 rounded-xl border border-gold/20 bg-card/90 p-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
                <Sparkles className="h-5 w-5 text-gold" />
              </div>
              <div>
                <p className="text-sm font-semibold">200+ Projects</p>
                <p className="text-xs text-muted-foreground">Successfully Delivered</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function StatsSection() {
  return (
    <section id="stats" className="border-y border-border/50 bg-muted/30 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="text-center"
          >
            <div className="font-serif text-3xl font-bold text-gold md:text-4xl">
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function ServicesSection() {
  return (
    <section id="services" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Our Services
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comprehensive design solutions for every space and vision
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[22rem]">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`group relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-gold/5 hover:-translate-y-1 ${
                i === 0 || i === 3 ? "md:col-span-2" : ""
              }`}
            >
              {/* Background image */}
              <div className="absolute inset-0">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover opacity-20 transition-all duration-500 group-hover:opacity-30 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40" />
              </div>

              {/* Content */}
              <div className="relative flex h-full flex-col justify-end p-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10 backdrop-blur-sm">
                  {service.icon}
                </div>
                <div className="font-serif text-lg font-semibold text-foreground">
                  {service.title}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {service.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PortfolioSection() {
  return (
    <section id="portfolio" className="py-24 bg-muted/20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Our Portfolio
          </h2>
          <p className="mt-4 text-muted-foreground">
            A glimpse into spaces we&apos;ve transformed
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portfolio.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative overflow-hidden rounded-xl"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={800}
                  height={600}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-6 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <span className="text-xs font-medium uppercase tracking-wider text-gold">
                  {item.category}
                </span>
                <h3 className="mt-1 font-serif text-lg font-semibold text-white">
                  {item.title}
                </h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
            What Our Clients Say
          </h2>
          <p className="mt-4 text-muted-foreground">
            Trusted by homeowners and businesses across the city
          </p>
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
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80"
          alt="Beautiful interior"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-serif text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Transform Your Space?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Let us bring your vision to life. Schedule a consultation
            and take the first step toward your dream interior.
          </p>
          <div className="mt-10">
            <Link href="/login">
              <Button
                size="lg"
                className="group bg-gold text-gold-foreground hover:bg-gold/90"
              >
                Start Your Project
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/10 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="font-serif text-lg font-bold">
              Igolo Interior
            </span>
          </div>
          <div className="flex gap-8">
            <a href="#services" className="text-sm text-muted-foreground hover:text-foreground">
              Services
            </a>
            <a href="#portfolio" className="text-sm text-muted-foreground hover:text-foreground">
              Portfolio
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground">
              Testimonials
            </a>
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Portal
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Igolo Interior. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ---- Page ----

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ServicesSection />
      <PortfolioSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  )
}

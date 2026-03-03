"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Player } from "@remotion/player"
import { TextGenerateEffect } from "@/components/ui/aceternity/text-generate-effect"
import { SectionHeading } from "@/components/marketing/section-heading"
import { StatsCounter } from "@/components/remotion/compositions/stats-counter"
import { ArrowRight } from "lucide-react"

const portfolioProjects = [
  {
    slug: "modern-living-room",
    title: "Modern Living Room",
    category: "Residential",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    location: "Whitefield, Bangalore",
    area: "1,200 sqft",
    year: "2024",
  },
  {
    slug: "luxury-kitchen",
    title: "Luxury Kitchen",
    category: "Kitchen Design",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    location: "Koramangala, Bangalore",
    area: "400 sqft",
    year: "2024",
  },
  {
    slug: "master-bedroom-suite",
    title: "Master Bedroom Suite",
    category: "Bedroom",
    image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
    location: "HSR Layout, Bangalore",
    area: "600 sqft",
    year: "2023",
  },
  {
    slug: "executive-office",
    title: "Executive Office",
    category: "Commercial",
    image: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80",
    location: "MG Road, Bangalore",
    area: "2,500 sqft",
    year: "2023",
  },
  {
    slug: "minimalist-dining",
    title: "Minimalist Dining",
    category: "Residential",
    image: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
    location: "Indiranagar, Bangalore",
    area: "350 sqft",
    year: "2024",
  },
  {
    slug: "spa-bathroom",
    title: "Spa Bathroom",
    category: "Bathroom",
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    location: "JP Nagar, Bangalore",
    area: "180 sqft",
    year: "2023",
  },
  {
    slug: "penthouse-living",
    title: "Penthouse Living",
    category: "Residential",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    location: "Lavelle Road, Bangalore",
    area: "3,500 sqft",
    year: "2024",
  },
  {
    slug: "modular-kitchen",
    title: "Modular Kitchen",
    category: "Kitchen Design",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    location: "Electronic City, Bangalore",
    area: "300 sqft",
    year: "2023",
  },
  {
    slug: "kids-bedroom",
    title: "Kids Bedroom",
    category: "Bedroom",
    image: "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80",
    location: "Sarjapur Road, Bangalore",
    area: "250 sqft",
    year: "2024",
  },
  {
    slug: "boutique-hotel-lobby",
    title: "Boutique Hotel Lobby",
    category: "Commercial",
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    location: "Brigade Road, Bangalore",
    area: "4,000 sqft",
    year: "2023",
  },
  {
    slug: "open-plan-studio",
    title: "Open Plan Studio",
    category: "Residential",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    location: "Marathahalli, Bangalore",
    area: "800 sqft",
    year: "2024",
  },
  {
    slug: "luxury-bathroom",
    title: "Luxury Bathroom",
    category: "Bathroom",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    location: "Jayanagar, Bangalore",
    area: "220 sqft",
    year: "2023",
  },
]

const categories = ["All", "Residential", "Kitchen Design", "Bedroom", "Commercial", "Bathroom"]

const statsData = [
  { value: 200, suffix: "+", label: "Projects" },
  { value: 50000, suffix: "+", label: "Sqft Designed" },
  { value: 12, suffix: "", label: "Cities" },
]

export default function PortfolioPage() {
  const [activeCategory, setActiveCategory] = useState("All")

  const filteredProjects = activeCategory === "All"
    ? portfolioProjects
    : portfolioProjects.filter((p) => p.category === activeCategory)

  const statsInputProps = useMemo(
    () => statsData.map((s) => ({ value: s.value, label: s.label, suffix: s.suffix })),
    []
  )

  return (
    <>
      {/* Hero */}
      <section className="relative pt-16">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <TextGenerateEffect
            words="Our Transformations"
            className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/60"
          >
            Explore our portfolio of completed projects spanning residential,
            commercial, and hospitality spaces across India.
          </motion.p>
        </div>

        {/* Stats ribbon */}
        <div className="border-y border-gold/10 bg-[#080D19] py-8">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-8 px-6">
            {statsData.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center">
                <div className="h-[100px] w-[100px]">
                  <Player
                    component={StatsCounter}
                    inputProps={statsInputProps[i]}
                    durationInFrames={120}
                    compositionWidth={400}
                    compositionHeight={400}
                    fps={30}
                    autoPlay
                    acknowledgeRemotionLicense
                    style={{ width: "100%", height: "100%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <section className="bg-[#0B1120] py-24">
        <div className="mx-auto max-w-7xl px-6">
          {/* Filter tabs */}
          <div className="mb-12 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? "text-gold"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                {activeCategory === category && (
                  <motion.div
                    layoutId="portfolio-tab"
                    className="absolute inset-0 rounded-full border border-gold/40 bg-gold/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{category}</span>
              </button>
            ))}
          </div>

          {/* Grid */}
          <motion.div layout className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project, i) => (
                <motion.div
                  key={project.slug}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link href={`/portfolio/${project.slug}`}>
                    <div className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/5 bg-[#111827]">
                      <Image
                        src={project.image}
                        alt={project.title}
                        fill
                        className="object-cover transition-all duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                      <div className="absolute inset-0 flex flex-col justify-end p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <span className="text-xs font-medium uppercase tracking-wider text-gold">
                          {project.category}
                        </span>
                        <h3 className="mt-1 font-serif text-lg font-semibold text-white">
                          {project.title}
                        </h3>
                        <div className="mt-2 flex items-center gap-1 text-xs text-white/60">
                          <span>{project.location}</span>
                          <span className="text-gold/40">|</span>
                          <span>{project.area}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-sm text-gold">
                          View Project
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>
    </>
  )
}

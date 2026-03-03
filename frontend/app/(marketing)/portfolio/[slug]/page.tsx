"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { useParams } from "next/navigation"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { Player } from "@remotion/player"
import { BlueprintScroll } from "@/components/remotion/compositions/blueprint-scroll"
import { ArrowLeft, ArrowRight, X, MapPin, Calendar, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// Full project data with descriptions, before/after images, gallery
const projectsData = [
  {
    slug: "modern-living-room",
    title: "Modern Living Room",
    category: "Residential",
    location: "Whitefield, Bangalore",
    area: "1,200 sqft",
    duration: "8 weeks",
    year: "2024",
    clientType: "Family of 4",
    heroImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1564078516393-cf04bd96e2d8?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    description: "A complete transformation of a traditional living space into a modern, open-concept area with clean lines and warm textures. The design focused on maximizing natural light while creating cozy conversation nooks. Premium Italian marble flooring, custom teak wood paneling, and curated art pieces define this luxurious yet livable space.",
    challenges: "The original layout had load-bearing walls that restricted the open-plan vision. Our team worked with structural engineers to safely remove partitions while maintaining integrity.",
    materials: "Italian Statuario marble, Burmese Teak, German hardware, hand-woven Turkish rugs",
    gallery: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
    ],
  },
  {
    slug: "luxury-kitchen",
    title: "Luxury Kitchen",
    category: "Kitchen Design",
    location: "Koramangala, Bangalore",
    area: "400 sqft",
    duration: "6 weeks",
    year: "2024",
    clientType: "Couple",
    heroImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    description: "A gourmet kitchen designed for passionate home cooks. The L-shaped island provides ample prep space while the ceiling-height cabinetry maximizes storage. Integrated appliances, quartz countertops, and a built-in wine cooler make this the heart of the home.",
    challenges: "Complex plumbing rerouting was needed to accommodate the island sink and dishwasher placement while maintaining proper drainage slope.",
    materials: "Caesarstone quartz, walnut veneer cabinets, Bosch integrated appliances, brass fixtures",
    gallery: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    ],
  },
  {
    slug: "master-bedroom-suite",
    title: "Master Bedroom Suite",
    category: "Bedroom",
    location: "HSR Layout, Bangalore",
    area: "600 sqft",
    duration: "5 weeks",
    year: "2023",
    clientType: "Young Professionals",
    heroImage: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
    description: "A serene master suite with walk-in wardrobe and ensuite bathroom. The design combines plush textiles, ambient lighting, and a neutral color palette to create a spa-like retreat within the home.",
    challenges: "The client wanted a walk-in closet without reducing the bedroom's spacious feel. Creative partition walls and mirrors created the illusion of more space.",
    materials: "Egyptian cotton upholstery, Belgian linen, solid oak flooring, Hettich soft-close fittings",
    gallery: [
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
      "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    ],
  },
  {
    slug: "executive-office",
    title: "Executive Office",
    category: "Commercial",
    location: "MG Road, Bangalore",
    area: "2,500 sqft",
    duration: "10 weeks",
    year: "2023",
    clientType: "Tech Company",
    heroImage: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80",
    description: "A modern tech office blending productivity with comfort. Open collaboration areas, private meeting pods, and biophilic design elements create an inspiring workspace that attracts top talent.",
    challenges: "Acoustic management in an open-plan layout required innovative sound-absorbing panels and strategic spatial zoning.",
    materials: "Acoustic panels, polished concrete, steel-framed glass partitions, live-edge wood tables",
    gallery: [
      "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    ],
  },
  {
    slug: "minimalist-dining",
    title: "Minimalist Dining",
    category: "Residential",
    location: "Indiranagar, Bangalore",
    area: "350 sqft",
    duration: "4 weeks",
    year: "2024",
    clientType: "Couple",
    heroImage: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
    description: "A minimalist dining area that celebrates simplicity and craftsmanship. The custom live-edge dining table becomes the centerpiece, complemented by statement pendant lighting and carefully curated art.",
    challenges: "Achieving warmth in a minimalist design required strategic use of natural materials and layered lighting.",
    materials: "Live-edge walnut slab, hand-blown glass pendants, linen seat covers, micro-cement walls",
    gallery: [
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    ],
  },
  {
    slug: "spa-bathroom",
    title: "Spa Bathroom",
    category: "Bathroom",
    location: "JP Nagar, Bangalore",
    area: "180 sqft",
    duration: "4 weeks",
    year: "2023",
    clientType: "Family",
    heroImage: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
    description: "A spa-inspired bathroom featuring a freestanding bathtub, rainfall shower, and natural stone surfaces. Heated flooring and ambient lighting create a luxurious self-care sanctuary.",
    challenges: "Waterproofing with natural stone required specialized membranes and expert installation to prevent future damage.",
    materials: "Carrara marble, teak wood accents, Grohe rainshower, heated porcelain tiles",
    gallery: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
      "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80",
    ],
  },
  {
    slug: "penthouse-living",
    title: "Penthouse Living",
    category: "Residential",
    location: "Lavelle Road, Bangalore",
    area: "3,500 sqft",
    duration: "14 weeks",
    year: "2024",
    clientType: "Business Executive",
    heroImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1564078516393-cf04bd96e2d8?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    description: "A sprawling penthouse with panoramic city views. The design maximizes the connection between indoor and outdoor living with floor-to-ceiling glass, a private terrace garden, and seamless transitions between entertainment and private zones.",
    challenges: "Coordinating with building management for structural modifications on the top floor while maintaining the rooftop garden's waterproofing integrity.",
    materials: "Nero Marquina marble, white oak, motorized blinds, Lutron smart lighting system",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    ],
  },
  {
    slug: "modular-kitchen",
    title: "Modular Kitchen",
    category: "Kitchen Design",
    location: "Electronic City, Bangalore",
    area: "300 sqft",
    duration: "5 weeks",
    year: "2023",
    clientType: "Family of 5",
    heroImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    description: "A fully modular kitchen optimized for an Indian cooking style with a dedicated masala zone, heavy-duty chimney, and pull-out pantry storage. Every inch is designed for efficiency.",
    challenges: "Fitting a full-size pantry, wet and dry kitchen zones within a compact footprint required precise 3D modeling and custom-sized cabinets.",
    materials: "Marine plywood, Fenix NTM laminate, Hettich Cargo fittings, granite countertop",
    gallery: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    ],
  },
  {
    slug: "kids-bedroom",
    title: "Kids Bedroom",
    category: "Bedroom",
    location: "Sarjapur Road, Bangalore",
    area: "250 sqft",
    duration: "3 weeks",
    year: "2024",
    clientType: "Family",
    heroImage: "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80",
    description: "A playful yet functional kids' room with a loft bed, study area, and abundant storage. Safety was paramount — rounded edges, non-toxic paints, and anti-slip flooring throughout.",
    challenges: "Designing a room that grows with the child — the furniture system is modular and can be reconfigured as the child ages.",
    materials: "Non-toxic water-based paints, solid birch plywood, EVA foam flooring, child-safe hardware",
    gallery: [
      "https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&q=80",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    ],
  },
  {
    slug: "boutique-hotel-lobby",
    title: "Boutique Hotel Lobby",
    category: "Commercial",
    location: "Brigade Road, Bangalore",
    area: "4,000 sqft",
    duration: "16 weeks",
    year: "2023",
    clientType: "Hospitality Group",
    heroImage: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    description: "A statement hotel lobby that tells a story of Bangalore's heritage through contemporary design. Custom brass installations, local art commissioning, and a dramatic double-height atrium create an unforgettable first impression.",
    challenges: "Coordinating 12 different artisan workshops for custom pieces while maintaining a strict timeline for the hotel's soft launch date.",
    materials: "Custom brass metalwork, Rajasthani jali screens, terrazzo flooring, commissioned local art",
    gallery: [
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
      "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800&q=80",
    ],
  },
  {
    slug: "open-plan-studio",
    title: "Open Plan Studio",
    category: "Residential",
    location: "Marathahalli, Bangalore",
    area: "800 sqft",
    duration: "6 weeks",
    year: "2024",
    clientType: "Freelance Designer",
    heroImage: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    description: "A work-from-home studio where living and working seamlessly coexist. Sliding panels allow the workspace to be hidden away in the evening, transforming the studio into a cozy apartment.",
    challenges: "Creating distinct zones without walls in a compact studio — solved with ceiling-height sliding panels and strategic lighting changes.",
    materials: "Oak sliding panels, polished concrete floor, modular shelving system, track lighting",
    gallery: [
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80",
    ],
  },
  {
    slug: "luxury-bathroom",
    title: "Luxury Bathroom",
    category: "Bathroom",
    location: "Jayanagar, Bangalore",
    area: "220 sqft",
    duration: "4 weeks",
    year: "2023",
    clientType: "Retired Couple",
    heroImage: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80",
    beforeImage: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80",
    afterImage: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    description: "An accessible luxury bathroom with walk-in shower, dual vanities, and aging-in-place features seamlessly integrated into a stylish design. Grab bars double as towel holders, and the curbless shower is both elegant and safe.",
    challenges: "Integrating accessibility features without compromising the luxurious aesthetic — every safety element was designed to look intentional.",
    materials: "Large-format porcelain tiles, solid surface vanity tops, chrome accessibility hardware, LED mirror",
    gallery: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
      "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    ],
  },
]

export default function ProjectCaseStudy() {
  const { slug } = useParams()
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [dividerPosition, setDividerPosition] = useState(50)
  const sliderRef = useRef<HTMLDivElement>(null)

  const project = projectsData.find((p) => p.slug === slug)
  const projectIndex = projectsData.findIndex((p) => p.slug === slug)
  const prevProject = projectIndex > 0 ? projectsData[projectIndex - 1] : null
  const nextProject = projectIndex < projectsData.length - 1 ? projectsData[projectIndex + 1] : null

  const blueprintProps = useMemo(() => ({}), [])

  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100])

  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return
    const rect = sliderRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100))
    setDividerPosition(pct)
  }, [])

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-white">Project Not Found</h1>
          <Link href="/portfolio" className="mt-4 inline-block text-gold hover:underline">
            Back to Portfolio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Hero */}
      <section className="relative h-[70vh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroY }}>
          <Image
            src={project.heroImage}
            alt={project.title}
            fill
            className="object-cover"
            priority
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-black/40 to-black/20" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-xs font-medium text-gold backdrop-blur-sm">
                {project.category}
              </span>
              <h1 className="mt-3 font-serif text-4xl font-bold text-white md:text-5xl">
                {project.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {project.location}
                </span>
                <span className="text-gold/30">|</span>
                <span>{project.area}</span>
                <span className="text-gold/30">|</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {project.year}
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Project Info Strip */}
      <section className="border-y border-gold/10 bg-[#080D19]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-6 py-6 md:grid-cols-5">
          {[
            { label: "Client Type", value: project.clientType },
            { label: "Location", value: project.location },
            { label: "Area", value: project.area },
            { label: "Duration", value: project.duration },
            { label: "Year", value: project.year },
          ].map((info) => (
            <div key={info.label} className="rounded-lg border border-gold/10 px-4 py-3 text-center">
              <div className="text-xs text-gold/60">{info.label}</div>
              <div className="mt-1 text-sm font-medium text-white">{info.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Before / After */}
      <section className="bg-[#0B1120] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-white">
            Before & After
          </h2>

          <div
            ref={sliderRef}
            className="relative aspect-[16/9] cursor-col-resize overflow-hidden rounded-2xl border border-gold/10"
            onMouseMove={(e) => handleSliderMove(e.clientX)}
            onTouchMove={(e) => handleSliderMove(e.touches[0].clientX)}
          >
            {/* After (full width background) */}
            <Image
              src={project.afterImage}
              alt="After"
              fill
              className="object-cover"
            />

            {/* Before (clipped) */}
            <div
              className="absolute inset-0"
              style={{ clipPath: `inset(0 ${100 - dividerPosition}% 0 0)` }}
            >
              <Image
                src={project.beforeImage}
                alt="Before"
                fill
                className="object-cover"
                style={{ filter: "grayscale(0.3) brightness(0.9)" }}
              />
            </div>

            {/* Divider */}
            <div
              className="absolute top-0 bottom-0 z-10 w-[3px]"
              style={{
                left: `${dividerPosition}%`,
                background: "linear-gradient(180deg, transparent 0%, #CBB282 20%, #E8D5B7 50%, #CBB282 80%, transparent 100%)",
                boxShadow: "0 0 15px rgba(203, 178, 130, 0.6)",
              }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gold/50 bg-[#0B1120]/80 backdrop-blur-sm">
                <ArrowLeft className="h-3 w-3 text-gold" />
                <ArrowRight className="h-3 w-3 text-gold" />
              </div>
            </div>

            {/* Labels */}
            <span className="absolute left-4 top-4 z-10 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              Before
            </span>
            <span className="absolute right-4 top-4 z-10 rounded-full bg-gold/30 px-3 py-1 text-xs font-medium text-gold backdrop-blur-sm">
              After
            </span>
          </div>
          <p className="mt-3 text-center text-xs text-white/30">Drag the golden line to compare</p>
        </div>
      </section>

      {/* Description */}
      <section className="bg-[#0B1120] pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-2xl font-bold text-white">The Story</h2>
              <p className="mt-4 leading-relaxed text-white/60">{project.description}</p>

              <h3 className="mt-8 font-serif text-lg font-semibold text-white">Challenges</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{project.challenges}</p>

              <h3 className="mt-8 font-serif text-lg font-semibold text-white">Materials</h3>
              <p className="mt-2 text-sm text-white/50">{project.materials}</p>
            </div>

            {/* Blueprint player */}
            <div>
              <h3 className="mb-3 font-serif text-lg font-semibold text-white">Floor Plan</h3>
              <div className="aspect-square overflow-hidden rounded-xl border border-gold/10">
                <Player
                  component={BlueprintScroll}
                  inputProps={blueprintProps}
                  durationInFrames={600}
                  compositionWidth={1920}
                  compositionHeight={1080}
                  fps={30}
                  autoPlay
                  loop
                  acknowledgeRemotionLicense
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-[#080D19] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="mb-8 text-center font-serif text-2xl font-bold text-white">
            Project Gallery
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {project.gallery.map((img, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl"
                onClick={() => setLightboxImage(img)}
              >
                <Image
                  src={img}
                  alt={`${project.title} gallery ${i + 1}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Maximize2 className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute right-6 top-6 rounded-full border border-white/20 bg-black/50 p-2 text-white hover:bg-black/80"
              onClick={() => setLightboxImage(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-h-[80vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={lightboxImage}
                alt="Gallery full view"
                width={1200}
                height={800}
                className="rounded-xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prev / Next */}
      <section className="border-t border-gold/10 bg-[#0B1120] py-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
          {prevProject ? (
            <Link href={`/portfolio/${prevProject.slug}`} className="group flex items-center gap-2 text-white/50 hover:text-gold">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span className="text-sm">{prevProject.title}</span>
            </Link>
          ) : <div />}

          <Link href="/portfolio" className="text-sm text-white/30 hover:text-white/60">
            All Projects
          </Link>

          {nextProject ? (
            <Link href={`/portfolio/${nextProject.slug}`} className="group flex items-center gap-2 text-white/50 hover:text-gold">
              <span className="text-sm">{nextProject.title}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : <div />}
        </div>
      </section>
    </>
  )
}

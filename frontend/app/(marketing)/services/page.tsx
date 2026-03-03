"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Player } from "@remotion/player"
import { TextGenerateEffect } from "@/components/ui/aceternity/text-generate-effect"
import { SectionHeading } from "@/components/marketing/section-heading"
import { ServiceMorph } from "@/components/remotion/compositions/service-morph"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const servicesData = [
  {
    title: "Interior Design",
    description:
      "Complete end-to-end design solutions from concept to execution. We create spaces that reflect your personality, lifestyle, and aspirations with meticulous attention to every detail.",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80",
    points: [
      "Mood boards & concept development",
      "3D visualization before execution",
      "Material & color palette curation",
      "Complete project management",
    ],
  },
  {
    title: "Architecture",
    description:
      "Spatial planning and structural design that maximizes functionality while creating stunning visual flow. Our architects blend form with function to craft buildings that inspire.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    points: [
      "Site analysis & spatial planning",
      "Structural design & engineering",
      "Building permits & approvals",
      "Sustainable design practices",
    ],
  },
  {
    title: "3D Visualization",
    description:
      "Photo-realistic 3D renders that bring your dream space to life before a single wall is touched. Walk through your future home virtually and make confident decisions.",
    image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
    points: [
      "Photorealistic rendering",
      "Virtual reality walkthroughs",
      "Material & lighting previews",
      "Design iteration & refinement",
    ],
  },
  {
    title: "Space Planning",
    description:
      "Optimized layouts that balance aesthetics with ergonomics, making every square foot count. We consider Vastu, traffic flow, and natural light to create harmonious spaces.",
    image: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
    points: [
      "Vastu & Feng Shui compliance",
      "Traffic flow optimization",
      "Furniture layout planning",
      "Natural light maximization",
    ],
  },
  {
    title: "Renovation",
    description:
      "Transform existing spaces with modern upgrades that breathe new life into your home. From kitchen remodels to complete makeovers, we handle it all with precision.",
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    points: [
      "Kitchen & bathroom remodels",
      "Structural modifications",
      "Flooring & ceiling upgrades",
      "Smart home integration",
    ],
  },
  {
    title: "Consultation",
    description:
      "Expert guidance on materials, color palettes, lighting, and furnishings. Our designers help you make informed decisions that align with your budget and vision.",
    image: "https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80",
    points: [
      "Color & material consultation",
      "Budget planning & optimization",
      "Vendor selection guidance",
      "Design style assessment",
    ],
  },
]

function ServiceBlock({
  service,
  index,
}: {
  service: (typeof servicesData)[0]
  index: number
}) {
  const isReversed = index % 2 === 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`flex flex-col gap-8 lg:gap-16 ${
        isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl lg:w-1/2">
        <Image
          src={service.image}
          alt={service.title}
          fill
          className="object-cover transition-transform duration-700 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="flex w-full flex-col justify-center lg:w-1/2">
        <motion.h3
          initial={{ opacity: 0, x: isReversed ? -20 : 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="font-serif text-2xl font-bold text-white md:text-3xl"
        >
          {service.title}
        </motion.h3>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4 text-white/60 leading-relaxed"
        >
          {service.description}
        </motion.p>

        <ul className="mt-6 space-y-3">
          {service.points.map((point, i) => (
            <motion.li
              key={point}
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
              className="flex items-center gap-3 text-sm text-white/70"
            >
              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
              {point}
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-8"
        >
          <Link href="/contact">
            <Button className="group bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20">
              Get a Quote
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default function ServicesPage() {
  const morphInputProps = useMemo(() => ({}), [])

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0 opacity-30">
          <Player
            component={ServiceMorph}
            inputProps={morphInputProps}
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
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#0B1120]/50 via-[#0B1120]/30 to-[#0B1120]" />

        <div className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
          <TextGenerateEffect
            words="Transforming Visions Into Reality"
            className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/60"
          >
            From concept sketches to final handover, our comprehensive design
            services cover every aspect of creating your perfect space.
          </motion.p>
        </div>
      </section>

      {/* Services Detail */}
      <section className="bg-[#0B1120] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            label="What We Offer"
            title="Our Services"
            subtitle="Each service is tailored to your unique requirements and delivered with uncompromising quality."
          />

          <div className="space-y-24">
            {servicesData.map((service, i) => (
              <ServiceBlock key={service.title} service={service} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gold/10 bg-[#080D19] py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
              Ready to Transform Your Space?
            </h2>
            <p className="mt-4 text-white/50">
              Schedule a free consultation and let us bring your vision to life.
            </p>
            <div className="mt-8">
              <Link href="/contact">
                <Button
                  size="lg"
                  className="group bg-gold text-gold-foreground shadow-lg shadow-gold/20 hover:bg-gold/90"
                >
                  Contact Us Today
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}

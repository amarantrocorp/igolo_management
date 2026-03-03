"use client"

import { useRef, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { motion, useScroll } from "framer-motion"
import { Player, PlayerRef } from "@remotion/player"
import { TextGenerateEffect } from "@/components/ui/aceternity/text-generate-effect"
import { SectionHeading } from "@/components/marketing/section-heading"
import { CompanyTimeline } from "@/components/remotion/compositions/company-timeline"
import { StatsCounter } from "@/components/remotion/compositions/stats-counter"
import { Sparkles, Shield, Heart } from "lucide-react"

const teamMembers = [
  {
    name: "Arun Krishnan",
    role: "Founder & Principal Designer",
    bio: "15+ years transforming spaces across India. Arun's vision drives every project.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
  },
  {
    name: "Meera Patel",
    role: "Head of Architecture",
    bio: "Award-winning architect specializing in sustainable residential design.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
  },
  {
    name: "Rahul Sharma",
    role: "3D Visualization Lead",
    bio: "Creates photorealistic renders that make clients fall in love with their future homes.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80",
  },
  {
    name: "Priya Nair",
    role: "Project Manager",
    bio: "Ensures every project is delivered on time and within budget. Zero compromises.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
  },
  {
    name: "Karthik Reddy",
    role: "Site Supervisor",
    bio: "10 years of on-ground execution experience. Quality is his obsession.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
  },
  {
    name: "Anjali Verma",
    role: "Interior Stylist",
    bio: "Curates the finishing touches — art, furnishings, and accessories that make a house a home.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
  },
]

const values = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Excellence",
    desc: "We pursue perfection in every detail, from the initial sketch to the final handover.",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Integrity",
    desc: "Transparent pricing, honest timelines, and no hidden costs. Your trust is our foundation.",
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: "Passion",
    desc: "We don't just design spaces — we craft experiences that enrich lives every single day.",
  },
]

const statsData = [
  { value: 200, suffix: "+", label: "Projects" },
  { value: 98, suffix: "%", label: "Satisfaction" },
  { value: 15, suffix: "+", label: "Team Members" },
  { value: 50, suffix: "+", label: "Awards" },
]

export default function AboutPage() {
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const timelinePlayerRef = useRef<PlayerRef>(null)
  const totalFrames = 500

  const { scrollYProgress: timelineScrollProgress } = useScroll({
    target: timelineContainerRef,
    offset: ["start start", "end end"],
  })

  useEffect(() => {
    const unsubscribe = timelineScrollProgress.on("change", (progress) => {
      const frame = Math.round(progress * (totalFrames - 1))
      timelinePlayerRef.current?.seekTo(frame)
    })
    return unsubscribe
  }, [timelineScrollProgress, totalFrames])

  const timelineInputProps = useMemo(() => ({}), [])
  const [isStatsVisible, setIsStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)
    return () => observer.disconnect()
  }, [])

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
            words="Crafting Excellence Since 2010"
            className="text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/60"
          >
            A team of passionate designers, architects, and craftsmen dedicated
            to transforming spaces into extraordinary experiences.
          </motion.p>
        </div>
      </section>

      {/* Story Section */}
      <section className="bg-[#0B1120] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
                Our Story
              </span>
              <h2 className="mt-3 font-serif text-3xl font-bold text-white">
                Born from a Vision to Transform Lives
              </h2>
              <div className="mt-2 h-px w-16 bg-gold/50" />
              <p className="mt-6 leading-relaxed text-white/60">
                Founded in 2010 in the heart of Bangalore, Igolo Interior began
                as a small studio with a big dream — to make world-class interior
                design accessible to every homeowner. Over 15 years, we&apos;ve grown
                from a team of 3 to 15+ passionate professionals.
              </p>
              <p className="mt-4 leading-relaxed text-white/60">
                Our mission is simple: create spaces that inspire joy, foster
                connection, and enhance the quality of everyday living. We believe
                great design isn&apos;t a luxury — it&apos;s a necessity that transforms
                how people experience their homes and workplaces.
              </p>
              <p className="mt-4 leading-relaxed text-white/60">
                Today, with 200+ completed projects and multiple industry awards,
                we continue to push boundaries while staying true to our core
                belief: every space tells a story, and it&apos;s our privilege to
                help write yours.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl lg:w-1/2"
            >
              <Image
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80"
                alt="Igolo Interior office"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Timeline Section (Scroll-Driven Remotion) */}
      <section
        ref={timelineContainerRef}
        className="relative bg-[#080D19]"
        style={{ height: "300vh" }}
      >
        <div className="sticky top-0 flex h-screen items-center">
          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-gold/10">
              <Player
                ref={timelinePlayerRef}
                component={CompanyTimeline}
                inputProps={timelineInputProps}
                durationInFrames={totalFrames}
                compositionWidth={1920}
                compositionHeight={1080}
                fps={30}
                acknowledgeRemotionLicense
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <p className="mt-4 text-center text-xs text-white/25">
              Scroll to explore our journey
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-[#0B1120] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionHeading
            label="The People"
            title="Meet Our Team"
            subtitle="A diverse team of creative minds, united by a shared passion for exceptional design."
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member, i) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -5 }}
                className="group rounded-xl border border-white/5 bg-[#111827] p-6 transition-all duration-300 hover:border-gold/20 hover:shadow-lg hover:shadow-gold/5"
              >
                <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-gold/20 transition-colors group-hover:border-gold/50">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-4 text-center">
                  <h3 className="font-serif text-lg font-semibold text-white">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-gold/70">
                    {member.role}
                  </p>
                  <p className="mt-2 text-sm text-white/40">{member.bio}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-gold/10 bg-[#080D19] py-24">
        <div className="mx-auto max-w-5xl px-6">
          <SectionHeading
            label="What Drives Us"
            title="Our Values"
          />
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-xl border border-gold/10 bg-[#0B1120] p-8 text-center transition-all duration-300 hover:border-gold/30"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold transition-colors group-hover:bg-gold/20">
                  {value.icon}
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold text-white">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm text-white/50">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Ribbon */}
      <section ref={statsRef} className="bg-[#0B1120] py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 md:grid-cols-4">
          {statsData.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="h-[140px] w-[140px]">
                {isStatsVisible && (
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
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

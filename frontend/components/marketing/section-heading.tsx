"use client"

import { motion } from "framer-motion"

interface SectionHeadingProps {
  label: string
  title: string
  subtitle?: string
}

export function SectionHeading({ label, title, subtitle }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-16 text-center"
    >
      <span className="text-sm font-medium uppercase tracking-widest text-gold/80">
        {label}
      </span>
      <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-white md:text-5xl">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-white/50">{subtitle}</p>
      )}
    </motion.div>
  )
}

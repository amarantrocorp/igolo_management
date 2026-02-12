"use client"

import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function BentoGrid({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  )
}

export function BentoGridItem({
  className,
  title,
  description,
  icon,
  index,
}: {
  className?: string
  title?: string | React.ReactNode
  description?: string | React.ReactNode
  icon?: React.ReactNode
  index?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: (index ?? 0) * 0.1 }}
      className={cn(
        "group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-gold/5 hover:-translate-y-1",
        className
      )}
    >
      <div className="transition-transform duration-300 group-hover/bento:translate-x-1">
        {icon}
        <div className="mt-4 font-serif text-lg font-semibold text-foreground">
          {title}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          {description}
        </div>
      </div>
    </motion.div>
  )
}

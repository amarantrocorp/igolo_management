"use client"

import React from "react"
import { cn } from "@/lib/utils"

export function MovingBorder({
  children,
  duration = 3000,
  className,
  containerClassName,
  borderClassName,
  as: Component = "div",
  ...otherProps
}: {
  children: React.ReactNode
  duration?: number
  className?: string
  containerClassName?: string
  borderClassName?: string
  as?: React.ElementType
  [key: string]: unknown
}) {
  return (
    <Component
      className={cn(
        "relative overflow-hidden rounded-xl bg-transparent p-[1px]",
        containerClassName
      )}
      {...otherProps}
    >
      <div
        className={cn(
          "absolute inset-[-100%] rounded-xl",
          borderClassName
        )}
        style={{
          background:
            "conic-gradient(from 0deg, transparent, hsl(var(--gold)), transparent, hsl(var(--gold)), transparent)",
          animation: `border-spin ${duration}ms linear infinite`,
        }}
      />
      <div
        className={cn(
          "relative rounded-xl bg-card",
          className
        )}
      >
        {children}
      </div>
    </Component>
  )
}

export function GlowCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card p-6 shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:scale-[1.02] hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5",
        className
      )}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  )
}

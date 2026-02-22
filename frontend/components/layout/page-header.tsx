"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  gradient: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  gradient,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "animate-fade-in-up relative flex items-center justify-between overflow-hidden rounded-2xl border border-border/40 bg-card p-5 md:p-6",
        className
      )}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: `radial-gradient(circle, ${gradient.split(",")[0].replace("linear-gradient(135deg, ", "")}, transparent 70%)` }}
      />

      <div className="relative flex items-center gap-4">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg"
          style={{ background: gradient }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>

      {action && <div className="relative">{action}</div>}
    </div>
  )
}

// Simple stat card for inner-page use
interface MiniStatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  trend?: { value: string; up: boolean }
}

export function MiniStatCard({ title, value, icon: Icon, gradient, trend }: MiniStatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all duration-300 hover:border-border/80 hover:shadow-lg hover:shadow-black/5">
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: gradient }}
      />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {trend.value}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl shadow-md"
          style={{ background: gradient }}
        >
          <Icon className="h-4.5 w-4.5 text-white" />
        </div>
      </div>
    </div>
  )
}

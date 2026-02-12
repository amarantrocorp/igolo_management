"use client"

import Image from "next/image"
import { Sparkles } from "lucide-react"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left: Image Panel */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80"
          alt="Luxury interior design"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />

        {/* Branding overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold" />
            <span className="font-serif text-xl font-bold text-white">
              Igolo Interior
            </span>
          </div>

          <div>
            <h2 className="font-serif text-4xl font-bold leading-tight text-white">
              Crafting Spaces<br />
              That Inspire Living
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/70">
              From concept to completion, we transform ordinary spaces into
              extraordinary experiences.
            </p>
            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-2xl font-bold text-gold">200+</p>
                <p className="text-xs text-white/60">Projects Delivered</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gold">98%</p>
                <p className="text-xs text-white/60">Client Satisfaction</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gold">15+</p>
                <p className="text-xs text-white/60">Years Experience</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4">
        <div className="absolute inset-0 overflow-hidden lg:hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
              <Sparkles className="h-7 w-7 text-gold" />
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight">Igolo Interior</h1>
            <p className="text-sm text-muted-foreground">
              Premium Interior Design Management
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

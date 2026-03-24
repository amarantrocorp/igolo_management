"use client"

import Sidebar from "@/components/layout/sidebar"
import Header from "@/components/layout/header"
import TrialBanner from "@/components/layout/trial-banner"
import { useAuthStore } from "@/store/auth-store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const { user, token, activeOrgId } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && (!token || !user || !activeOrgId)) {
      router.push("/login")
    }
  }, [mounted, token, user, activeOrgId, router])

  // Redirect platform admins from /dashboard to /dashboard/platform
  useEffect(() => {
    if (mounted && user?.is_platform_admin && pathname === "/dashboard") {
      router.replace("/dashboard/platform")
    }
  }, [mounted, user, pathname, router])

  if (!mounted || !token || !user || !activeOrgId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {!user.is_platform_admin && <TrialBanner />}
        <Header />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

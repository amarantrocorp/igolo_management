"use client"

import { useAuthStore } from "@/store/auth-store"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ClientGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const { user, token, activeOrgId, roleInOrg } = useAuthStore()
  const router = useRouter()
  const effectiveRole = roleInOrg ?? user?.role

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    if (!token || !user || !activeOrgId) {
      router.push("/client-login")
      return
    }

    // Non-client users should go to the dashboard
    if (effectiveRole && effectiveRole !== "CLIENT") {
      router.push("/dashboard")
      return
    }
  }, [mounted, token, user, activeOrgId, effectiveRole, router])

  if (!mounted || !token || !user || !activeOrgId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (effectiveRole !== "CLIENT") {
    return null
  }

  return <>{children}</>
}

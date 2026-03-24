"use client"

import { useAuthStore } from "@/store/auth-store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) {
  const { user, roleInOrg } = useAuthStore()
  const router = useRouter()
  const effectiveRole = roleInOrg ?? user?.role

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (!effectiveRole || !allowedRoles.includes(effectiveRole)) {
      router.push("/unauthorized")
      return
    }
  }, [user, effectiveRole, allowedRoles, router])

  if (!user || !effectiveRole || !allowedRoles.includes(effectiveRole)) return null

  return <>{children}</>
}

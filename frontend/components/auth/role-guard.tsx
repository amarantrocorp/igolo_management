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
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (!allowedRoles.includes(user.role)) {
      router.push("/unauthorized")
      return
    }
  }, [user, allowedRoles, router])

  if (!user || !allowedRoles.includes(user.role)) return null

  return <>{children}</>
}

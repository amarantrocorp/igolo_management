"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Eye, EyeOff, Building2 } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import type { LoginResponse, UserWithOrg, OrgOption } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

function getRoleDefaultRoute(role: string, isPlatformAdmin?: boolean): string {
  if (isPlatformAdmin) {
    return "/dashboard/platform"
  }
  switch (role) {
    case "SUPER_ADMIN":
    case "MANAGER":
      return "/dashboard"
    case "BDE":
    case "SALES":
      return "/dashboard/sales/leads"
    case "SUPERVISOR":
      return "/dashboard/projects"
    case "CLIENT":
      return "/client-portal"
    default:
      return "/dashboard"
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [pendingOrgSelection, setPendingOrgSelection] = useState<{
    token: string
    organizations: OrgOption[]
  } | null>(null)

  // Extract tenant slug from subdomain (e.g., "plyman" from "plyman.igolohomes.com")
  const tenantSlug = (() => {
    if (typeof window === "undefined") return null
    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost"
    const hostname = window.location.hostname
    if (hostname === baseDomain || hostname === `www.${baseDomain}` || hostname === "localhost") {
      return null // Main domain — no tenant
    }
    const slug = hostname.replace(`.${baseDomain}`, "")
    return slug || null
  })()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const formData = new URLSearchParams()
      formData.append("username", data.email)
      formData.append("password", data.password)

      const params = tenantSlug ? `?tenant_slug=${tenantSlug}` : ""
      const tokenResponse = await api.post<LoginResponse>(`/auth/token${params}`, formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })

      return tokenResponse.data
    },
    onSuccess: async (data) => {
      if (data.requires_org_selection && data.organizations?.length) {
        // User has multiple orgs, no default — show org picker
        setPendingOrgSelection({
          token: data.access_token,
          organizations: data.organizations,
        })
        return
      }

      // Single org or default org auto-selected — fetch user profile
      const userResponse = await api.get<UserWithOrg>("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const user = userResponse.data

      login(
        data.access_token,
        data.refresh_token ?? null,
        user,
        user.active_org_id,
        user.role_in_org,
        user.organizations,
      )
      const route = getRoleDefaultRoute(user.role_in_org, user.is_platform_admin)
      router.push(route)
    },
  })

  const selectOrgMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await api.post<{ access_token: string; refresh_token: string }>(
        "/auth/select-org",
        { org_id: orgId },
        { headers: { Authorization: `Bearer ${pendingOrgSelection!.token}` } },
      )

      const userResponse = await api.get<UserWithOrg>("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })

      return { tokenData: data, user: userResponse.data }
    },
    onSuccess: ({ tokenData, user }) => {
      login(
        tokenData.access_token,
        tokenData.refresh_token,
        user,
        user.active_org_id,
        user.role_in_org,
        user.organizations,
      )
      setPendingOrgSelection(null)
      const route = getRoleDefaultRoute(user.role_in_org, user.is_platform_admin)
      router.push(route)
    },
  })

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data)
  }

  // ── Org Selection Screen ──
  if (pendingOrgSelection) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Select Organization</CardTitle>
          <CardDescription>
            You belong to multiple organizations. Please select one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingOrgSelection.organizations.map((org) => (
            <Button
              key={org.id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              disabled={selectOrgMutation.isPending}
              onClick={() => selectOrgMutation.mutate(org.id)}
            >
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{org.name}</span>
                <span className="text-xs text-muted-foreground">
                  {org.role.replace("_", " ")} &middot; {org.slug}
                </span>
              </div>
            </Button>
          ))}
          {selectOrgMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to select organization. Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // ── Login Form ──
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {loginMutation.isError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {(() => {
                const err = loginMutation.error as any
                const status = err?.response?.status
                const detail = err?.response?.data?.detail || ""
                if (status === 401) return "Invalid email or password. Please try again."
                if (status === 403 && detail.includes("workspace:")) {
                  const slug = detail.split("workspace:")[1]?.trim()
                  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "igolohomes.com"
                  return (
                    <>
                      This account belongs to a different workspace.{" "}
                      <a href={`https://${slug}.${baseDomain}/login`} className="underline font-medium">
                        Login at {slug}.{baseDomain}
                      </a>
                    </>
                  )
                }
                if (status === 403) return detail || "You don't have access to this workspace."
                if (status === 429) return "Too many login attempts. Please wait a minute."
                return "An error occurred. Please try again later."
              })()}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register("password")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign in
          </Button>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Forgot your password?
          </Link>
          <Link
            href="/client-login"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Are you a client? Login to Client Portal &rarr;
          </Link>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary font-medium hover:underline"
            >
              Start your free 14-day trial
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

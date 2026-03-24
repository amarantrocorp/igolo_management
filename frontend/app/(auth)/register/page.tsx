"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
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

const registerSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().max(20).optional(),
})

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterApiResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user_id: string
  org_id: string
  org_slug: string
  message: string
}

function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" }
  if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" }
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" }
  return { score, label: "Strong", color: "bg-green-500" }
}

const passwordRules = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
]

export default function RegisterPage() {
  const router = useRouter()
  const { login: storeLogin } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      company_name: "",
      full_name: "",
      email: "",
      password: "",
      phone: "",
    },
  })

  const password = watch("password", "")
  const strength = getPasswordStrength(password)

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const response = await api.post<RegisterApiResponse>("/auth/register", data)
      return response.data
    },
    onSuccess: async (data) => {
      // Fetch user profile with org context
      const userResponse = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const user = userResponse.data

      storeLogin(
        data.access_token,
        data.refresh_token,
        user,
        user.active_org_id,
        user.role_in_org,
        user.organizations,
      )

      // In production with subdomains, redirect to the tenant's subdomain
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN
      if (baseDomain && baseDomain !== "localhost" && data.org_slug) {
        window.location.href = `https://${data.org_slug}.${baseDomain}/dashboard`
      } else {
        router.push("/register/onboarding")
      }
    },
  })

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data)
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Start Your Free Trial</CardTitle>
        <CardDescription>
          14 days free. No credit card required.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {registerMutation.isError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {(registerMutation.error as any)?.response?.data?.detail ||
                "An error occurred. Please try again later."}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              placeholder="Your Interior Design Studio"
              autoComplete="organization"
              {...register("company_name")}
            />
            {errors.company_name && (
              <p className="text-xs text-destructive">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Your Full Name</Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              autoComplete="name"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

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
                placeholder="Create a strong password"
                autoComplete="new-password"
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
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{strength.label}</span>
                </div>
                <ul className="space-y-1">
                  {passwordRules.map((rule) => {
                    const passed = rule.test(password)
                    return (
                      <li
                        key={rule.label}
                        className={`flex items-center gap-1.5 text-xs ${
                          passed ? "text-green-600" : "text-muted-foreground"
                        }`}
                      >
                        {passed ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        {rule.label}
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              autoComplete="tel"
              {...register("phone")}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Eye, EyeOff, Home } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import type { LoginResponse, UserWithOrg } from "@/types"
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

export default function ClientLoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

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

      const tokenResponse = await api.post<LoginResponse>("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })

      return tokenResponse.data
    },
    onSuccess: async (data) => {
      // Fetch user profile
      const userResponse = await api.get<UserWithOrg>("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      })
      const user = userResponse.data

      // Only allow CLIENT role
      if (user.role_in_org !== "CLIENT") {
        throw new Error("NOT_CLIENT")
      }

      login(
        data.access_token,
        data.refresh_token ?? null,
        user,
        user.active_org_id,
        user.role_in_org,
        user.organizations,
      )

      router.push("/client-portal")
    },
    onError: (error: Error) => {
      // Error handled in UI below
    },
  })

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data)
  }

  const getErrorMessage = () => {
    const error = loginMutation.error as Error
    if (!error) return null
    if (error.message === "NOT_CLIENT") {
      return "This login is for clients only. Please use the main login page for staff access."
    }
    if (error.message === "Request failed with status code 401") {
      return "Invalid email or password. Please try again."
    }
    return "An error occurred. Please try again later."
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Home className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Client Portal
          </span>
        </div>
        <CardTitle className="text-xl">
          Track Your Interior Project
        </CardTitle>
        <CardDescription>
          Sign in to view your project progress, timelines, and payments
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {loginMutation.isError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {getErrorMessage()}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
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
            Sign in to Client Portal
          </Button>
          <div className="flex flex-col items-center gap-2">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot your password?
            </Link>
            <Link
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Back to main login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

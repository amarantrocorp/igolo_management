"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2, Eye, EyeOff } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import type { AuthTokens, User } from "@/types"
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

function getRoleDefaultRoute(role: string): string {
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
      return "/dashboard/client-portal"
    default:
      return "/dashboard"
  }
}

export default function LoginPage() {
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
      // OAuth2 password flow uses form data
      const formData = new URLSearchParams()
      formData.append("username", data.email)
      formData.append("password", data.password)

      const tokenResponse = await api.post<AuthTokens>("/auth/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })

      // Set token temporarily to fetch user profile
      const token = tokenResponse.data.access_token
      const refreshToken = tokenResponse.data.refresh_token

      const userResponse = await api.get<User>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })

      return {
        token,
        refreshToken,
        user: userResponse.data,
      }
    },
    onSuccess: (data) => {
      login(data.token, data.refreshToken, data.user)
      const route = getRoleDefaultRoute(data.user.role)
      router.push(route)
    },
  })

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data)
  }

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
              {(loginMutation.error as Error)?.message ===
              "Request failed with status code 401"
                ? "Invalid email or password. Please try again."
                : "An error occurred. Please try again later."}
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
        </CardFooter>
      </form>
    </Card>
  )
}

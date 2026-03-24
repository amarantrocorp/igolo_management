"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface InviteInfo {
  org_name: string
  email: string
  role: string
  expires_at: string
  already_has_account: boolean
}

interface AcceptResponse {
  access_token: string
  refresh_token: string
  token_type: string
  message: string
}

const newUserSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

type NewUserForm = z.infer<typeof newUserSchema>

function roleLabel(role: string) {
  return role.replace(/_/g, " ")
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <AcceptInviteContent />
    </Suspense>
  )
}

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const { user, login } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    data: inviteInfo,
    isLoading,
    error,
  } = useQuery<InviteInfo>({
    queryKey: ["invite-info", token],
    queryFn: async () => (await api.get(`/auth/invite-info?token=${token}`)).data,
    enabled: !!token,
    retry: false,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewUserForm>({
    resolver: zodResolver(newUserSchema),
  })

  const acceptMutation = useMutation({
    mutationFn: async (data: { token: string; full_name?: string; password?: string }) =>
      (await api.post("/auth/accept-invite", data)).data as AcceptResponse,
    onSuccess: async (res) => {
      // Fetch user profile with the new token
      const oldToken = api.defaults.headers.common["Authorization"]
      api.defaults.headers.common["Authorization"] = `Bearer ${res.access_token}`

      try {
        const { data: profile } = await api.get("/auth/me")
        login(
          res.access_token,
          res.refresh_token,
          profile,
          profile.active_org_id,
          profile.role_in_org,
          profile.organizations
        )
        router.push("/dashboard")
      } catch {
        // Fallback — just store tokens and redirect
        router.push("/dashboard")
      }
    },
    onError: () => {},
  })

  if (!token) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-center font-medium">Invalid invitation link</p>
          <p className="text-center text-sm text-muted-foreground">
            No invitation token was provided. Please check the link from your email.
          </p>
          <Button variant="outline" onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !inviteInfo) {
    const errMsg =
      (error as any)?.response?.data?.detail ?? "This invitation is invalid or has expired."
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <XCircle className="h-10 w-10 text-destructive" />
          <p className="text-center font-medium">Invitation Error</p>
          <p className="text-center text-sm text-muted-foreground">{errMsg}</p>
          <Button variant="outline" onClick={() => router.push("/login")}>
            Go to Login
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (acceptMutation.isSuccess) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
          <p className="text-center text-lg font-medium">Welcome!</p>
          <p className="text-center text-sm text-muted-foreground">
            You have successfully joined {inviteInfo.org_name}. Redirecting...
          </p>
        </CardContent>
      </Card>
    )
  }

  // Existing user — just accept
  if (inviteInfo.already_has_account) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle>Join {inviteInfo.org_name}</CardTitle>
          <CardDescription>
            You have been invited to join as{" "}
            <Badge variant="secondary" className="ml-1">
              {roleLabel(inviteInfo.role)}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Invitation for <strong>{inviteInfo.email}</strong>
            </p>
          </div>

          {user && user.email === inviteInfo.email ? (
            <Button
              className="w-full"
              onClick={() => acceptMutation.mutate({ token: token! })}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Accept Invitation
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                You have an existing account. Please log in to accept this invitation.
              </p>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push(`/login?redirect=/accept-invite?token=${token}`)}
              >
                Log In to Accept
              </Button>
            </div>
          )}

          {acceptMutation.isError && (
            <p className="text-center text-sm text-destructive">
              {(acceptMutation.error as any)?.response?.data?.detail ?? "Failed to accept invitation."}
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // New user — registration form
  const onSubmit = (data: NewUserForm) => {
    acceptMutation.mutate({
      token: token!,
      full_name: data.full_name,
      password: data.password,
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>Join {inviteInfo.org_name}</CardTitle>
        <CardDescription>
          Create your account to join as{" "}
          <Badge variant="secondary" className="ml-1">
            {roleLabel(inviteInfo.role)}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-3 text-center">
            <p className="text-sm text-muted-foreground">
              Account will be created for <strong>{inviteInfo.email}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              placeholder="John Doe"
              {...register("full_name")}
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {acceptMutation.isError && (
            <p className="text-center text-sm text-destructive">
              {(acceptMutation.error as any)?.response?.data?.detail ?? "Failed to create account."}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={acceptMutation.isPending}>
            {acceptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account & Join
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

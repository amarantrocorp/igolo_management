"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CreditCard,
  Check,
  Crown,
  Loader2,
  Users,
  FolderKanban,
  Zap,
  Shield,
  MessageSquare,
  Sparkles,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────

interface PlanFeatures {
  max_users: number
  max_projects: number
  max_leads: number
  storage_gb: number
  whatsapp: boolean
  ai_analysis: boolean
}

interface PlanInfo {
  name: string
  price_monthly: number
  price_yearly: number
  features: PlanFeatures
}

interface BillingStatus {
  plan: string
  status: string
  trial_expires_at: string | null
  days_remaining: number | null
  max_users: number
  max_projects: number
  current_users: number
  current_projects: number
}

// Razorpay types declared in components/payments/razorpay-button.tsx

declare global {
  interface Window {
    Razorpay: any
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// ─── Helpers ────────────────────────────────────────────────

function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

const PLAN_DISPLAY: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  FREE: { label: "Free", icon: <Shield className="h-5 w-5" />, color: "text-muted-foreground" },
  STARTER: { label: "Starter", icon: <Zap className="h-5 w-5" />, color: "text-blue-500" },
  PRO: { label: "Pro", icon: <Crown className="h-5 w-5" />, color: "text-amber-500" },
  ENTERPRISE: { label: "Enterprise", icon: <Sparkles className="h-5 w-5" />, color: "text-purple-500" },
}

const FEATURE_LIST: { key: keyof PlanFeatures; label: string; format: (v: unknown) => string }[] = [
  { key: "max_users", label: "Team Members", format: (v) => (v === -1 ? "Unlimited" : `Up to ${v}`) },
  { key: "max_projects", label: "Active Projects", format: (v) => (v === -1 ? "Unlimited" : `Up to ${v}`) },
  { key: "max_leads", label: "Leads", format: (v) => (v === -1 ? "Unlimited" : `Up to ${v}`) },
  { key: "storage_gb", label: "Storage", format: (v) => `${v} GB` },
  { key: "whatsapp", label: "WhatsApp Integration", format: (v) => (v ? "Included" : "Not included") },
  { key: "ai_analysis", label: "AI Analysis", format: (v) => (v ? "Included" : "Not included") },
]

// ─── Component ──────────────────────────────────────────────

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Fetch current billing status
  const { data: billing, isLoading: billingLoading } = useQuery<BillingStatus>({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const { data } = await api.get("/billing/current")
      return data
    },
  })

  // Fetch available plans
  const { data: plans } = useQuery<PlanInfo[]>({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data } = await api.get("/billing/plans")
      return data
    },
  })

  const handleUpgrade = useCallback(
    async (plan: string) => {
      setUpgrading(plan)
      try {
        const loaded = await loadRazorpayScript()
        if (!loaded) {
          toast({ title: "Error", description: "Failed to load payment gateway.", variant: "destructive" })
          setUpgrading(null)
          return
        }

        const { data: order } = await api.post("/billing/subscribe", {
          plan,
          billing_cycle: billingCycle,
        })

        const options = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: "IntDesignERP",
          description: `${plan} Plan - ${billingCycle}`,
          order_id: order.order_id,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const { data: verification } = await api.post("/billing/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              })
              if (verification.success) {
                toast({ title: "Upgrade Successful", description: verification.message })
                queryClient.invalidateQueries({ queryKey: ["billing-status"] })
              }
            } catch {
              toast({ title: "Verification Error", description: "Payment processed but verification failed. Contact support.", variant: "destructive" })
            } finally {
              setUpgrading(null)
            }
          },
          prefill: { name: "", email: "", contact: "" },
          theme: { color: "#CBB282" },
          modal: { ondismiss: () => setUpgrading(null) },
        }

        const rzp = new window.Razorpay(options as any)
        rzp.on("payment.failed", () => {
          toast({ title: "Payment Failed", description: "Could not complete the payment.", variant: "destructive" })
          setUpgrading(null)
        })
        rzp.open()
      } catch {
        toast({ title: "Error", description: "Could not initiate upgrade.", variant: "destructive" })
        setUpgrading(null)
      }
    },
    [billingCycle, queryClient]
  )

  const handleCancel = useCallback(async () => {
    try {
      await api.post("/billing/cancel")
      toast({ title: "Cancelled", description: "Your subscription has been cancelled." })
      queryClient.invalidateQueries({ queryKey: ["billing-status"] })
    } catch {
      toast({ title: "Error", description: "Could not cancel subscription.", variant: "destructive" })
    }
  }, [queryClient])

  const currentPlanRank = ["FREE", "STARTER", "PRO", "ENTERPRISE"]
  const currentRank = currentPlanRank.indexOf(billing?.plan ?? "FREE")

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your plan, billing cycle, and subscription details.
          </p>
        </div>

        {/* Current Plan Card */}
        {billingLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : billing ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={PLAN_DISPLAY[billing.plan]?.color ?? ""}>
                    {PLAN_DISPLAY[billing.plan]?.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {PLAN_DISPLAY[billing.plan]?.label ?? billing.plan} Plan
                    </CardTitle>
                    <CardDescription>Current subscription</CardDescription>
                  </div>
                </div>
                <Badge
                  variant={
                    billing.status === "ACTIVE"
                      ? "default"
                      : billing.status === "TRIAL"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {billing.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {billing.status === "TRIAL" && billing.days_remaining != null && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Trial Days Left</p>
                    <p className={`text-2xl font-bold ${billing.days_remaining <= 3 ? "text-red-500" : "text-amber-500"}`}>
                      {billing.days_remaining}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> Team Members
                  </div>
                  <p className="text-2xl font-bold">
                    {billing.current_users}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {billing.max_users === -1 ? "Unlimited" : billing.max_users}
                    </span>
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderKanban className="h-4 w-4" /> Projects
                  </div>
                  <p className="text-2xl font-bold">
                    {billing.current_projects}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {billing.max_projects === -1 ? "Unlimited" : billing.max_projects}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
            {billing.status === "ACTIVE" && billing.plan !== "FREE" && (
              <CardFooter>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel Subscription
                </Button>
              </CardFooter>
            )}
          </Card>
        ) : null}

        {/* Plan Comparison */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Available Plans</h2>
            <Tabs
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
            >
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">
                  Yearly <Badge variant="secondary" className="ml-1.5 text-xs">Save 17%</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {(plans ?? []).map((plan) => {
              const planRank = currentPlanRank.indexOf(plan.name)
              const isCurrent = billing?.plan === plan.name
              const isDowngrade = planRank <= currentRank
              const price = billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly

              return (
                <Card
                  key={plan.name}
                  className={`relative ${isCurrent ? "border-primary ring-2 ring-primary/20" : ""}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge>Current Plan</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className={PLAN_DISPLAY[plan.name]?.color ?? ""}>
                      {PLAN_DISPLAY[plan.name]?.icon}
                    </div>
                    <CardTitle>{PLAN_DISPLAY[plan.name]?.label ?? plan.name}</CardTitle>
                    <CardDescription>
                      {plan.name === "ENTERPRISE" ? (
                        "Custom pricing"
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-foreground">
                            {formatPaise(price)}
                          </span>
                          <span className="text-muted-foreground">
                            /{billingCycle === "monthly" ? "mo" : "yr"}
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {FEATURE_LIST.map((feat) => {
                        const val = plan.features[feat.key]
                        const included =
                          typeof val === "boolean" ? val : typeof val === "number" && val !== 0
                        return (
                          <li key={feat.key} className="flex items-center gap-2 text-sm">
                            <Check
                              className={`h-4 w-4 flex-shrink-0 ${included ? "text-green-500" : "text-muted-foreground/30"}`}
                            />
                            <span className={included ? "" : "text-muted-foreground"}>
                              {feat.label}: {feat.format(val)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {plan.name === "ENTERPRISE" ? (
                      <Button variant="outline" className="w-full" asChild>
                        <a href="mailto:sales@igolo.in">Contact Sales</a>
                      </Button>
                    ) : isCurrent ? (
                      <Button disabled className="w-full">
                        Current Plan
                      </Button>
                    ) : isDowngrade ? (
                      <Button variant="outline" disabled className="w-full">
                        Downgrade
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={upgrading === plan.name}
                      >
                        {upgrading === plan.name ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        {upgrading === plan.name ? "Processing..." : "Upgrade"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

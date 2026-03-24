"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  TrendingUp,
  Building2,
  BarChart3,
  ShieldAlert,
  Percent,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import type { Organization, PlanTier, SubscriptionStatus } from "@/types"

interface PlatformStats {
  total_organizations: number
  total_users: number
  active_projects: number
  active_trials: number
  paying_customers: number
  suspended_count: number
  mrr: number
  trial_conversion_rate: number
}

const PLAN_PRICING: Record<PlanTier, { price: number; features: string[] }> = {
  FREE: {
    price: 0,
    features: ["3 users", "2 projects", "50 leads", "Basic features"],
  },
  STARTER: {
    price: 2999,
    features: ["10 users", "10 projects", "500 leads", "Email support"],
  },
  PRO: {
    price: 7999,
    features: [
      "50 users",
      "Unlimited projects",
      "Unlimited leads",
      "Priority support",
      "Advanced analytics",
    ],
  },
  ENTERPRISE: {
    price: 19999,
    features: [
      "Unlimited users",
      "Unlimited projects",
      "Unlimited leads",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
}

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  STARTER: "bg-blue-100 text-blue-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
}

const PIE_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#6b7280", "#ef4444"]

const STATUS_LABELS: SubscriptionStatus[] = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "SUSPENDED",
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  borderColor: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-md",
        borderColor
      )}
    >
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
          iconBg
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

export default function PlatformRevenuePage() {
  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["platform", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/platform/stats")
      return data
    },
    staleTime: 30000,
  })

  const { data: organizations = [], isLoading: orgsLoading } = useQuery<
    Organization[]
  >({
    queryKey: ["platform", "organizations"],
    queryFn: async () => {
      const { data } = await api.get("/platform/organizations")
      return data
    },
    staleTime: 30000,
  })

  const isLoading = statsLoading || orgsLoading

  // Revenue by Plan
  const revenueByPlan = useMemo(() => {
    const planCounts: Record<PlanTier, number> = {
      FREE: 0,
      STARTER: 0,
      PRO: 0,
      ENTERPRISE: 0,
    }
    organizations.forEach((org) => {
      const tier = org.plan_tier || "FREE"
      if (tier in planCounts) {
        planCounts[tier as PlanTier]++
      }
    })
    return (Object.keys(PLAN_PRICING) as PlanTier[]).map((tier) => ({
      name: tier,
      orgs: planCounts[tier],
      revenue: planCounts[tier] * PLAN_PRICING[tier].price,
    }))
  }, [organizations])

  // Subscription status breakdown
  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {}
    STATUS_LABELS.forEach((s) => (counts[s] = 0))
    organizations.forEach((org) => {
      const status = org.subscription_status || "TRIAL"
      counts[status] = (counts[status] || 0) + 1
    })
    const total = organizations.length || 1
    return STATUS_LABELS.map((status, index) => ({
      name: status,
      value: counts[status],
      percentage: Math.round((counts[status] / total) * 100),
      color: PIE_COLORS[index],
    }))
  }, [organizations])

  // Computed metrics
  const totalRevenue = revenueByPlan.reduce((sum, p) => sum + p.revenue, 0)
  const avgRevenuePerOrg =
    organizations.length > 0
      ? Math.round(totalRevenue / organizations.length)
      : 0
  const trialOrgs = organizations.filter(
    (o) => o.subscription_status === "TRIAL" || !o.subscription_status
  ).length
  const cancelledOrgs = organizations.filter(
    (o) => o.subscription_status === "CANCELLED"
  ).length
  const churnRate =
    organizations.length > 0
      ? Math.round((cancelledOrgs / organizations.length) * 100)
      : 0

  // Projections
  const projectedIfAllTrialsConvert =
    (stats?.mrr ?? 0) + trialOrgs * PLAN_PRICING.STARTER.price
  const conversionRate = stats?.trial_conversion_rate ?? 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Platform Revenue
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          Revenue analytics and billing insights across the platform.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              title="MRR"
              value={formatCurrency(stats?.mrr ?? 0)}
              subtitle="Monthly recurring revenue"
              icon={DollarSign}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              borderColor="border-emerald-100"
            />
            <StatCard
              title="Total Revenue (Est.)"
              value={formatCurrency(totalRevenue)}
              subtitle="Based on current subscriptions"
              icon={TrendingUp}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              borderColor="border-indigo-100"
            />
            <StatCard
              title="Avg Revenue / Org"
              value={formatCurrency(avgRevenuePerOrg)}
              subtitle={`${organizations.length} organizations`}
              icon={Building2}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              borderColor="border-blue-100"
            />
            <StatCard
              title="Churn Rate"
              value={`${churnRate}%`}
              subtitle={`${cancelledOrgs} cancelled orgs`}
              icon={Percent}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              borderColor="border-red-100"
            />
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Revenue by Plan - Bar Chart */}
            <div className="lg:col-span-7 rounded-xl border bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-semibold">Revenue by Plan</h2>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByPlan}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "revenue"
                          ? formatCurrency(value)
                          : `${value} orgs`,
                        name === "revenue" ? "Revenue" : "Organizations",
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar
                      dataKey="orgs"
                      fill="#818cf8"
                      name="orgs"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#34d399"
                      name="revenue"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subscription Status - Pie Chart */}
            <div className="lg:col-span-5 rounded-xl border bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold">Subscription Status</h2>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percentage }) =>
                        `${name} ${percentage}%`
                      }
                    >
                      {statusBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} orgs`,
                        name,
                      ]}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Plan Pricing Reference Table */}
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold">Plan Pricing Reference</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price / Month</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="text-right">
                    Current Subscribers
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(PLAN_PRICING) as PlanTier[]).map((tier) => {
                  const planData = revenueByPlan.find((p) => p.name === tier)
                  return (
                    <TableRow key={tier}>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            planColors[tier]
                          )}
                        >
                          {tier}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {PLAN_PRICING[tier].price === 0
                          ? "Free"
                          : formatCurrency(PLAN_PRICING[tier].price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {PLAN_PRICING[tier].features.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {planData?.orgs ?? 0}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Revenue Projections */}
          <div className="rounded-xl border bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <h2 className="text-lg font-semibold">Revenue Projections</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-sm text-muted-foreground">
                  If all trials convert (to Starter)
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-700">
                  {formatCurrency(projectedIfAllTrialsConvert)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {trialOrgs} trials x{" "}
                  {formatCurrency(PLAN_PRICING.STARTER.price)} + current MRR
                </p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Current Conversion Rate
                </p>
                <p className="mt-1 text-xl font-bold text-blue-700">
                  {conversionRate}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {stats?.paying_customers ?? 0} paying out of{" "}
                  {stats?.total_organizations ?? 0} total organizations
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

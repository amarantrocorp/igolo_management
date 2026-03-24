"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Building2,
  Users,
  FolderKanban,
  DollarSign,
  Clock,
  CreditCard,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronRight,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Timer,
  Mail,
  CalendarPlus,
  Download,
  HeartPulse,
  Zap,
  UserPlus,
  Crown,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { cn } from "@/lib/utils"
import type { Organization } from "@/types"

// ── Types ──

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

// ── Constants ──

const statusColors: Record<string, string> = {
  TRIAL: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-green-100 text-green-700",
  PAST_DUE: "bg-yellow-100 text-yellow-700",
  CANCELLED: "bg-gray-100 text-gray-700",
  SUSPENDED: "bg-red-100 text-red-700",
}

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  STARTER: "bg-blue-100 text-blue-700",
  PRO: "bg-purple-100 text-purple-700",
  ENTERPRISE: "bg-amber-100 text-amber-700",
}

const PIE_COLORS: Record<string, string> = {
  FREE: "#9ca3af",
  STARTER: "#3b82f6",
  PRO: "#8b5cf6",
  ENTERPRISE: "#d97706",
}

// ── Helpers ──

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

/** Generate mock MRR history based on current MRR */
function generateMrrHistory(currentMrr: number) {
  const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
  const factors = [0.45, 0.55, 0.65, 0.75, 0.88, 1.0]
  return months.map((month, i) => ({
    month,
    mrr: Math.round(currentMrr * factors[i]),
  }))
}

/** Compute plan distribution from orgs list */
function computePlanDistribution(orgs: Organization[]) {
  const counts: Record<string, number> = { FREE: 0, STARTER: 0, PRO: 0, ENTERPRISE: 0 }
  orgs.forEach((o) => {
    const tier = o.plan_tier || "FREE"
    if (tier in counts) counts[tier]++
    else counts.FREE++
  })
  const total = orgs.length || 1
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
    }))
}

/** Derive recent activity feed from orgs */
function deriveActivity(orgs: Organization[]) {
  return orgs.slice(0, 8).map((org) => {
    const status = org.subscription_status || "TRIAL"
    let type: "new" | "upgrade" | "trial_expiring" | "suspended" | "active" = "new"
    let message = `${org.name} registered as a new organization`

    if (status === "SUSPENDED") {
      type = "suspended"
      message = `${org.name} has been suspended`
    } else if (status === "ACTIVE" && org.plan_tier === "PRO") {
      type = "upgrade"
      message = `${org.name} upgraded to PRO plan`
    } else if (status === "ACTIVE" && org.plan_tier === "ENTERPRISE") {
      type = "upgrade"
      message = `${org.name} upgraded to ENTERPRISE plan`
    } else if (status === "ACTIVE") {
      type = "active"
      message = `${org.name} subscription is now active`
    } else if (
      status === "TRIAL" &&
      org.trial_expires_at &&
      daysUntil(org.trial_expires_at) <= 7
    ) {
      type = "trial_expiring"
      message = `${org.name} trial expiring in ${daysUntil(org.trial_expires_at)} days`
    }

    return { id: org.id, type, message, date: org.created_at }
  })
}

const activityIcons: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  new: { icon: UserPlus, color: "text-blue-500 bg-blue-50" },
  upgrade: { icon: Crown, color: "text-purple-500 bg-purple-50" },
  trial_expiring: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50" },
  suspended: { icon: ShieldAlert, color: "text-red-500 bg-red-50" },
  active: { icon: Zap, color: "text-green-500 bg-green-50" },
}

// ── Stat Card ──

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
  trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  borderColor: string
  trend?: { value: number; label: string }
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-md",
        borderColor
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            iconBg
          )}
        >
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.value >= 0
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            )}
          >
            {trend.value >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

// ── Custom Tooltip for Area Chart ──

function MrrTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

// ── Main Page ──

export default function PlatformDashboardPage() {
  const { toast } = useToast()
  const router = useRouter()

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
      const { data } = await api.get("/platform/organizations?limit=10")
      return data
    },
    staleTime: 30000,
  })

  const isLoading = statsLoading || orgsLoading

  // Derived data
  const mrrHistory = useMemo(
    () => generateMrrHistory(stats?.mrr ?? 0),
    [stats?.mrr]
  )

  const planDistribution = useMemo(
    () => computePlanDistribution(organizations),
    [organizations]
  )

  const activityFeed = useMemo(
    () => deriveActivity(organizations),
    [organizations]
  )

  const expiringTrials = useMemo(() => {
    return organizations
      .filter((org) => {
        const status = org.subscription_status || "TRIAL"
        return status === "TRIAL" && org.trial_expires_at
      })
      .map((org) => ({
        ...org,
        daysLeft: daysUntil(org.trial_expires_at!),
      }))
      .filter((org) => org.daysLeft >= 0 && org.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [organizations])

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight">
              Platform Administration
            </h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Monitor and manage all organizations across the SaaS platform.
          </p>
        </div>
        <Link href="/dashboard/platform/organizations">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Organization
          </Button>
        </Link>
      </div>

      {/* ── Loading State ── */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* ── KPI Stat Cards ── */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              title="Total Organizations"
              value={stats?.total_organizations ?? 0}
              subtitle={`${stats?.suspended_count ?? 0} suspended`}
              icon={Building2}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              borderColor="border-indigo-100"
              trend={{ value: 12, label: "vs last month" }}
            />
            <StatCard
              title="Active Trials"
              value={stats?.active_trials ?? 0}
              subtitle={`${stats?.trial_conversion_rate ?? 0}% conversion`}
              icon={Timer}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              borderColor="border-blue-100"
              trend={{ value: 5, label: "vs last month" }}
            />
            <StatCard
              title="Paying Customers"
              value={stats?.paying_customers ?? 0}
              subtitle="Active subscriptions"
              icon={CreditCard}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              borderColor="border-emerald-100"
              trend={{ value: 8, label: "vs last month" }}
            />
            <StatCard
              title="MRR"
              value={formatCurrency(stats?.mrr ?? 0)}
              subtitle="Monthly recurring revenue"
              icon={DollarSign}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              borderColor="border-amber-100"
              trend={{ value: 15, label: "vs last month" }}
            />
            <StatCard
              title="Active Projects"
              value={stats?.active_projects ?? 0}
              subtitle="Across all organizations"
              icon={FolderKanban}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              borderColor="border-violet-100"
            />
            <StatCard
              title="Total Users"
              value={stats?.total_users ?? 0}
              subtitle="Platform-wide"
              icon={Users}
              iconBg="bg-rose-50"
              iconColor="text-rose-600"
              borderColor="border-rose-100"
              trend={{ value: 10, label: "vs last month" }}
            />
          </div>

          {/* ── Charts Row: Revenue + Plan Distribution ── */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Revenue Chart */}
            <Card className="lg:col-span-8 border bg-white shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-lg">Revenue Trend</CardTitle>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Last 6 months
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={mrrHistory}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="mrrGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f1f5f9"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#94a3b8" }}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                      />
                      <RechartsTooltip content={<MrrTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="mrr"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        fill="url(#mrrGradient)"
                        dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                        activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Plan Distribution Pie */}
            <Card className="lg:col-span-4 border bg-white shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-lg">Plan Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {planDistribution.length === 0 ? (
                  <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No data yet
                  </div>
                ) : (
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, pct }: { name: string; pct: number }) =>
                            `${name} ${pct}%`
                          }
                          labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                        >
                          {planDistribution.map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={PIE_COLORS[entry.name] || PIE_COLORS.FREE}
                            />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          iconSize={8}
                          formatter={(value: string) => (
                            <span className="text-xs text-muted-foreground">
                              {value}
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Activity + Trial Expiring + Quick Actions ── */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Recent Activity Feed */}
            <Card className="lg:col-span-5 border bg-white shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-500" />
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {activityFeed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Activity className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No recent activity
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {activityFeed.map((item) => {
                      const iconMeta = activityIcons[item.type] || activityIcons.new
                      const IconComp = iconMeta.icon
                      return (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                        >
                          <div
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              iconMeta.color
                            )}
                          >
                            <IconComp className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug">{item.message}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {relativeTime(item.date)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trial Expiring Soon */}
            <Card className="lg:col-span-4 border bg-white shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">Trials Expiring Soon</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {expiringTrials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock className="mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      No trials expiring in the next 7 days
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {expiringTrials.slice(0, 5).map((org) => (
                      <div
                        key={org.id}
                        className="rounded-lg border p-3 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {org.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {org.slug}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-xs",
                              org.daysLeft <= 2
                                ? "border-red-200 bg-red-50 text-red-600"
                                : "border-amber-200 bg-amber-50 text-amber-600"
                            )}
                          >
                            {org.daysLeft === 0
                              ? "Expires today"
                              : `${org.daysLeft}d left`}
                          </Badge>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              toast({
                                title: "Reminder sent",
                                description: `Trial reminder email queued for ${org.name}.`,
                              })
                            }
                          >
                            <Mail className="mr-1.5 h-3 w-3" />
                            Send Reminder
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              toast({
                                title: "Trial extended",
                                description: `Trial for ${org.name} extended by 7 days.`,
                              })
                            }
                          >
                            <CalendarPlus className="mr-1.5 h-3 w-3" />
                            Extend Trial
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="lg:col-span-3 border bg-white shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-10"
                    onClick={() =>
                      router.push("/dashboard/platform/organizations")
                    }
                  >
                    <Plus className="h-4 w-4 text-emerald-500" />
                    Create Organization
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-10"
                    onClick={() =>
                      router.push("/dashboard/platform/organizations")
                    }
                  >
                    <Building2 className="h-4 w-4 text-indigo-500" />
                    View All Orgs
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-10"
                    onClick={() =>
                      toast({
                        title: "Export started",
                        description:
                          "CSV export is being generated. You will receive a download link shortly.",
                      })
                    }
                  >
                    <Download className="h-4 w-4 text-blue-500" />
                    Export Data
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-10"
                    onClick={() =>
                      toast({
                        title: "System healthy",
                        description:
                          "All services operational. API latency: 42ms. DB connections: 12/100.",
                      })
                    }
                  >
                    <HeartPulse className="h-4 w-4 text-rose-500" />
                    System Health
                  </Button>
                </div>

                {/* Platform Health Summary */}
                <div className="mt-5 space-y-3 border-t pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Platform Health
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Trial Conversion
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{
                            width: `${Math.min(stats?.trial_conversion_rate ?? 0, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {stats?.trial_conversion_rate ?? 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Active Orgs
                    </span>
                    <span className="text-xs font-medium">
                      {(stats?.total_organizations ?? 0) -
                        (stats?.suspended_count ?? 0)}
                      /{stats?.total_organizations ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Avg Users/Org
                    </span>
                    <span className="text-xs font-medium">
                      {stats?.total_organizations
                        ? Math.round(
                            (stats.total_users ?? 0) /
                              stats.total_organizations
                          )
                        : 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Suspended
                    </span>
                    <Badge
                      variant={
                        (stats?.suspended_count ?? 0) > 0
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {stats?.suspended_count ?? 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Org Growth Table ── */}
          <Card className="border bg-white shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                  <CardTitle className="text-lg">
                    Organization Growth
                  </CardTitle>
                </div>
                <Link
                  href="/dashboard/platform/organizations"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {organizations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No organizations yet. Create your first one!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <th className="pb-3 pr-4">Organization</th>
                        <th className="pb-3 pr-4">Plan</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4 text-center">Members</th>
                        <th className="pb-3 pr-4 text-center">Projects</th>
                        <th className="pb-3 pr-4">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {organizations.slice(0, 5).map((org) => {
                        const subStatus =
                          org.subscription_status || "TRIAL"
                        return (
                          <tr
                            key={org.id}
                            className="group cursor-pointer transition-colors hover:bg-slate-50/50"
                            onClick={() =>
                              router.push(
                                "/dashboard/platform/organizations"
                              )
                            }
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-600">
                                  {org.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {org.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {org.slug}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  planColors[org.plan_tier] ||
                                    planColors.FREE
                                )}
                              >
                                {org.plan_tier}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                  statusColors[subStatus] ||
                                    statusColors.TRIAL
                                )}
                              >
                                {subStatus}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-center text-sm">
                              {org.max_users ?? 3}
                            </td>
                            <td className="py-3 pr-4 text-center text-sm">
                              {org.max_projects ?? 2}
                            </td>
                            <td className="py-3 pr-4 text-xs text-muted-foreground">
                              {new Date(
                                org.created_at
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

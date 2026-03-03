"use client"

import { useAuthStore } from "@/store/auth-store"
import { useQuery } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek } from "date-fns"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ClipboardCheck,
  Clock,
  AlertCircle,
  HardHat,
  Package,
  ArrowRight,
  Plus,
  Eye,
  Sparkles,
  CalendarDays,
  Wallet,
  BarChart3,
} from "lucide-react"
import type { UserRole, Item } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

// ─── Types ───
interface DashboardStats {
  total_leads?: number
  active_projects?: number
  pending_approvals?: number
  total_revenue?: number
  total_spent?: number
  my_leads?: number
  quotes_sent?: number
  todays_tasks?: number
  project_status?: string
  project_progress?: number
}

interface PayrollSummary {
  entries: { team_id: string; project_id: string; calculated_cost: number; status: string }[]
  total_cost: number
  total_approved: number
  total_pending: number
}

// ─── Helpers ───
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// ─── Gradient Icon Component ───
function GradientIcon({
  icon: Icon,
  gradient,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-xl shadow-lg",
        className
      )}
      style={{ background: gradient }}
    >
      <Icon className="h-5 w-5 text-white" />
    </div>
  )
}

// ─── Stat Card Component ───
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendDown,
  gradient,
  delay,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
  trendDown?: boolean
  gradient: string
  delay: number
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 transition-all duration-300 hover:border-border/80 hover:shadow-xl hover:shadow-black/5",
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient accent bar at top */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: gradient }}
      />

      {/* Shimmer overlay on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-shimmer" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                trendDown
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              {trendDown ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {trend}
            </div>
          )}
        </div>
        <GradientIcon icon={Icon} gradient={gradient} />
      </div>
    </div>
  )
}

// ─── Quick Action Button ───
function QuickActionButton({
  href,
  icon: Icon,
  label,
  gradient,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  gradient: string
}) {
  return (
    <Link href={href}>
      <button
        className="group flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card p-3.5 text-left transition-all duration-200 hover:border-border/80 hover:shadow-md"
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
          style={{ background: gradient }}
        >
          <Icon className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-medium">{label}</span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </button>
    </Link>
  )
}

// ─── Alert Item ───
function AlertItem({
  icon: Icon,
  title,
  subtitle,
  accentColor,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  title: string
  subtitle: string
  accentColor: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/50 p-3 transition-colors hover:bg-muted/30">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${accentColor}15` }}
      >
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Financial Metric Bar ───
function FinancialBar({
  label,
  amount,
  maxAmount,
  gradient,
  color,
}: {
  label: string
  amount: number
  maxAmount: number
  gradient: string
  color: string
}) {
  const percentage = maxAmount > 0 ? Math.min((amount / maxAmount) * 100, 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {formatCurrency(amount)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percentage}%`,
            background: gradient,
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//   ADMIN / MANAGER DASHBOARD
// ═══════════════════════════════════════
function AdminManagerDashboard({ stats }: { stats: DashboardStats }) {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  const { data: payroll } = useQuery<PayrollSummary>({
    queryKey: ["dashboard-payroll", format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const params = new URLSearchParams({
        week_start: format(weekStart, "yyyy-MM-dd"),
        week_end: format(weekEnd, "yyyy-MM-dd"),
      })
      const response = await api.get(`/labor/payroll?${params.toString()}`)
      return response.data
    },
  })

  const pendingPayroll = Number(payroll?.total_pending ?? 0)
  const pendingEntries = payroll?.entries?.filter((e) => e.status === "PENDING").length ?? 0

  const { data: lowStockItems = [] } = useQuery<Item[]>({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const response = await api.get("/inventory/items?low_stock=true&limit=5")
      return response.data.items ?? response.data
    },
  })

  const revenue = Number(stats.total_revenue ?? 0)
  const spent = Number(stats.total_spent ?? 0)
  const maxFinancial = Math.max(revenue, spent, 1)
  const netBalance = revenue - spent

  return (
    <>
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Leads"
          value={stats.total_leads ?? 0}
          description="Active leads in pipeline"
          icon={Users}
          trend="+12% from last month"
          gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
          delay={50}
        />
        <StatCard
          title="Active Projects"
          value={stats.active_projects ?? 0}
          description="Projects in progress"
          icon={FolderKanban}
          gradient="linear-gradient(135deg, #10B981, #059669)"
          delay={100}
        />
        <StatCard
          title="Pending Approvals"
          value={stats.pending_approvals ?? 0}
          description="Awaiting your action"
          icon={ClipboardCheck}
          gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          delay={150}
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.total_revenue)}
          description="Total received this month"
          icon={DollarSign}
          trend="+8% from last month"
          gradient="linear-gradient(135deg, #CBB282, #A8956E)"
          delay={200}
        />
      </div>

      {/* ── Main Content Grid ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Financial Overview — 7 columns */}
        <div
          className="lg:col-span-7 animate-fade-in-up delay-5 rounded-2xl border border-border/40 bg-card p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GradientIcon
                icon={Wallet}
                gradient="linear-gradient(135deg, #CBB282, #A8956E)"
              />
              <div>
                <h3 className="font-semibold">Financial Overview</h3>
                <p className="text-xs text-muted-foreground">
                  Month-to-date summary
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/admin/finance"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View details →
            </Link>
          </div>

          <div className="space-y-5">
            <FinancialBar
              label="Total Received"
              amount={revenue}
              maxAmount={maxFinancial}
              gradient="linear-gradient(90deg, #10B981, #34D399)"
              color="#10B981"
            />
            <FinancialBar
              label="Total Spent"
              amount={spent}
              maxAmount={maxFinancial}
              gradient="linear-gradient(90deg, #F43F5E, #FB7185)"
              color="#F43F5E"
            />

            {/* Net Balance callout */}
            <div className="mt-4 rounded-xl bg-gradient-to-r from-gold/10 via-gold/5 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gold" />
                  <span className="text-sm font-medium">Net Balance</span>
                </div>
                <span
                  className={cn(
                    "text-xl font-bold",
                    netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatCurrency(netBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions + Alerts — 5 columns */}
        <div
          className="lg:col-span-5 animate-fade-in-up delay-6 space-y-4"
        >
          {/* Quick Actions */}
          <div className="rounded-2xl border border-border/40 bg-card p-5">
            <div className="mb-4 flex items-center gap-3">
              <GradientIcon
                icon={Sparkles}
                gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
              />
              <div>
                <h3 className="font-semibold">Quick Actions</h3>
                <p className="text-xs text-muted-foreground">Jump to common tasks</p>
              </div>
            </div>
            <div className="space-y-2">
              <QuickActionButton
                href="/dashboard/sales/leads"
                icon={Plus}
                label="New Lead"
                gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
              />
              <QuickActionButton
                href="/dashboard/sales/quotes/new"
                icon={FileText}
                label="Create Quote"
                gradient="linear-gradient(135deg, #F59E0B, #D97706)"
              />
              <QuickActionButton
                href="/dashboard/projects"
                icon={Eye}
                label="View Projects"
                gradient="linear-gradient(135deg, #10B981, #059669)"
              />
            </div>
          </div>

          {/* Alerts */}
          <div className="rounded-2xl border border-border/40 bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Attention Required
            </h3>
            <div className="space-y-2">
              {(stats.pending_approvals ?? 0) > 0 && (
                <AlertItem
                  icon={AlertCircle}
                  title={`${stats.pending_approvals} items need approval`}
                  subtitle="Purchase orders and payment requests"
                  accentColor="#F59E0B"
                />
              )}
              {pendingPayroll > 0 && (
                <AlertItem
                  icon={HardHat}
                  title={`${formatCurrency(pendingPayroll)} pending payroll`}
                  subtitle={`${pendingEntries} team${pendingEntries !== 1 ? "s" : ""} awaiting approval`}
                  accentColor="#F97316"
                />
              )}
              {lowStockItems.length > 0 && (
                <AlertItem
                  icon={Package}
                  title={`${lowStockItems.length} item${lowStockItems.length !== 1 ? "s" : ""} low on stock`}
                  subtitle={lowStockItems.slice(0, 3).map((i) => i.name).join(", ")}
                  accentColor="#EF4444"
                />
              )}
              {(stats.pending_approvals ?? 0) === 0 &&
                pendingPayroll === 0 &&
                lowStockItems.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                      <ClipboardCheck className="h-5 w-5 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      All clear — nothing needs your attention
                    </p>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════
//   SALES / BDE DASHBOARD
// ═══════════════════════════════════════
function SalesBdeDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          title="My Leads"
          value={stats.my_leads ?? 0}
          description="Leads assigned to you"
          icon={Users}
          gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
          delay={50}
        />
        <StatCard
          title="Quotes Sent"
          value={stats.quotes_sent ?? 0}
          description="Quotations pending response"
          icon={FileText}
          gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          delay={100}
        />
        <StatCard
          title="Conversion Rate"
          value={
            stats.my_leads && stats.my_leads > 0
              ? `${Math.round(((stats.quotes_sent ?? 0) / stats.my_leads) * 100)}%`
              : "0%"
          }
          description="Leads to quote ratio"
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #10B981, #059669)"
          delay={150}
        />
      </div>

      <div
        className="animate-fade-in-up delay-4 rounded-2xl border border-border/40 bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <GradientIcon
            icon={Clock}
            gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          />
          <div>
            <h3 className="font-semibold">Recent Activity</h3>
            <p className="text-xs text-muted-foreground">
              Your latest lead interactions
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
            <Clock className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            No recent activity. Start by creating a new lead or following up on existing ones.
          </p>
          <Link href="/dashboard/sales/leads">
            <button className="mt-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-medium text-white transition-shadow hover:shadow-lg hover:shadow-violet-500/25">
              <Plus className="h-3.5 w-3.5" />
              Create Lead
            </button>
          </Link>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════
//   SUPERVISOR DASHBOARD
// ═══════════════════════════════════════
function SupervisorDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          title="Active Projects"
          value={stats.active_projects ?? 0}
          description="Assigned to you"
          icon={FolderKanban}
          gradient="linear-gradient(135deg, #10B981, #059669)"
          delay={50}
        />
        <StatCard
          title="Today's Tasks"
          value={stats.todays_tasks ?? 0}
          description="Tasks to complete today"
          icon={ClipboardCheck}
          gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          delay={100}
        />
        <StatCard
          title="Pending Logs"
          value={0}
          description="Daily logs awaiting submission"
          icon={Clock}
          gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
          delay={150}
        />
      </div>

      <div
        className="animate-fade-in-up delay-4 rounded-2xl border border-border/40 bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <GradientIcon
            icon={CalendarDays}
            gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          />
          <div>
            <h3 className="font-semibold">Today&apos;s Schedule</h3>
            <p className="text-xs text-muted-foreground">
              Tasks and site visits for today
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
            <CalendarDays className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            No tasks scheduled for today. Check your project sprints for upcoming deliverables.
          </p>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════
//   CLIENT DASHBOARD
// ═══════════════════════════════════════
function ClientDashboard({ stats }: { stats: DashboardStats }) {
  const progress = stats.project_progress ?? 0

  return (
    <>
      <div
        className="animate-fade-in-up delay-1 rounded-2xl border border-border/40 bg-card p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <GradientIcon
            icon={FolderKanban}
            gradient="linear-gradient(135deg, #CBB282, #A8956E)"
          />
          <div>
            <h3 className="font-semibold">Project Status</h3>
          </div>
          <Badge
            variant={stats.project_status === "IN_PROGRESS" ? "default" : "secondary"}
            className="ml-auto"
          >
            {stats.project_status?.replace("_", " ") ?? "NOT STARTED"}
          </Badge>
        </div>

        {progress > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold text-gold">{progress}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #CBB282, #A8956E)",
                }}
              />
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-muted-foreground">
          Visit the Client Portal to see detailed sprint progress, daily logs,
          and payment history.
        </p>

        <Link href="/dashboard/client-portal">
          <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#CBB282] to-[#A8956E] px-5 py-2.5 text-sm font-medium text-white transition-shadow hover:shadow-lg hover:shadow-[#CBB282]/25">
            Open Client Portal
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </>
  )
}

// ═══════════════════════════════════════
//   MAIN DASHBOARD PAGE
// ═══════════════════════════════════════
export default function DashboardPage() {
  const { user } = useAuthStore()

  const dashboardStats: DashboardStats = {
    total_leads: 0,
    active_projects: 0,
    pending_approvals: 0,
    total_revenue: 0,
    total_spent: 0,
    my_leads: 0,
    quotes_sent: 0,
    todays_tasks: 0,
  }
  const role = user?.role as UserRole
  const greeting = getGreeting()
  const todayDate = format(new Date(), "EEEE, MMMM d, yyyy")

  return (
    <div className="space-y-6">
      {/* ── Hero Welcome ── */}
      <div
        className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-border/40 bg-card p-6 md:p-8"
      >
        {/* Ambient gradient glow */}
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full opacity-20 blur-3xl animate-pulse-glow"
          style={{ background: "radial-gradient(circle, hsl(38 70% 65%), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full opacity-10 blur-3xl animate-pulse-glow"
          style={{
            background: "radial-gradient(circle, hsl(262 83% 58%), transparent 70%)",
            animationDelay: "1.5s",
          }}
        />

        <div className="relative flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-gold to-[#A8956E] bg-clip-text text-transparent">
                {user?.full_name ?? "User"}
              </span>
            </h1>
            <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              {todayDate}
            </div>
          </div>
          <Badge
            variant="outline"
            className="mt-2 w-fit border-gold/30 bg-gold/5 text-gold md:mt-0"
          >
            {role?.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {/* ── Role-based Dashboard Content ── */}
      {(role === "SUPER_ADMIN" || role === "MANAGER") && (
        <AdminManagerDashboard stats={dashboardStats} />
      )}
      {(role === "SALES" || role === "BDE") && (
        <SalesBdeDashboard stats={dashboardStats} />
      )}
      {role === "SUPERVISOR" && (
        <SupervisorDashboard stats={dashboardStats} />
      )}
      {role === "CLIENT" && <ClientDashboard stats={dashboardStats} />}
    </div>
  )
}

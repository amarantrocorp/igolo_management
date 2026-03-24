"use client"

import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Users,
  FolderKanban,
  ClipboardCheck,
  ShoppingCart,
  AlertCircle,
  CreditCard,
  Plus,
  ArrowRight,
  UserPlus,
  Building2,
  FileText,
  Receipt,
  CircleDollarSign,
  AlertOctagon,
  ChevronRight,
  Sparkles,
  Check,
  Eye,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

// ── Types ──

interface DashboardStats {
  total_leads?: number
  active_projects?: number
  pending_approvals?: number
  purchase_requests?: number
  overdue_projects?: number
  pending_payments?: number
  total_revenue?: number
  total_spent?: number
}

interface ProjectProgress {
  id: string
  name: string
  progress: number
  phase: string
  status: string
}

interface PendingApproval {
  id: string
  title: string
  amount: string
  user: string
  time: string
}

interface ActivityItem {
  id: string
  message: string
  time: string
  type: "info" | "success" | "warning" | "error"
}

// ── Stat Card ──

const STAT_CONFIGS = [
  {
    key: "total_leads",
    title: "Total Leads",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-100",
    href: "/dashboard/sales/leads",
  },
  {
    key: "active_projects",
    title: "Active Projects",
    icon: FolderKanban,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-100",
    href: "/dashboard/projects",
  },
  {
    key: "pending_approvals",
    title: "Pending Approvals",
    icon: ClipboardCheck,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    borderColor: "border-amber-100",
    href: "/dashboard/admin/approvals",
  },
  {
    key: "purchase_requests",
    title: "Purchase Requests",
    icon: ShoppingCart,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    borderColor: "border-violet-100",
    href: "/dashboard/purchasing",
  },
  {
    key: "overdue_projects",
    title: "Overdue Projects",
    icon: AlertOctagon,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    borderColor: "border-red-100",
    href: "/dashboard/projects",
  },
  {
    key: "pending_payments",
    title: "Pending Payments",
    icon: CreditCard,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
    borderColor: "border-orange-100",
    href: "/dashboard/client-billing",
  },
] as const

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
  delay,
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  borderColor: string
  delay: number
  href?: string
}) {
  const content = (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-md",
        borderColor,
        href && "cursor-pointer"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

// ── Progress Bar ──

function ProjectProgressBar({
  name,
  progress,
  phase,
  status,
}: ProjectProgress) {
  return (
    <div className="space-y-2 py-3 border-b last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Phase: {phase}</span>
        <Badge
          variant={status === "Active" ? "default" : "secondary"}
          className="text-[10px] px-2 py-0"
        >
          {status}
        </Badge>
      </div>
    </div>
  )
}

// ── Quick Action Card ──

function QuickActionCard({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href?: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
}) {
  const content = (
    <div className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-white p-6 text-center transition-all duration-200 hover:border-blue-200 hover:shadow-md cursor-pointer">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 transition-colors group-hover:bg-blue-50">
        <Icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )

  if (onClick) {
    return <div onClick={onClick}>{content}</div>
  }

  return href ? <Link href={href}>{content}</Link> : content
}

// ── Activity Feed Item ──

function ActivityFeedItem({ message, time, type }: ActivityItem) {
  const dotColor = {
    info: "bg-blue-500",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
  }[type]

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <div className={cn("mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0", dotColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  )
}

// ── Pending Approval Card ──

function ApprovalCard({
  title,
  amount,
  user,
  time,
}: PendingApproval) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium leading-snug">{title}</p>
        <span className="text-sm font-bold whitespace-nowrap ml-2">{amount}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {user}
        </span>
        <span>&#9201; {time}</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => toast({ title: "Approved", description: "Approval submitted successfully" })}>
          Approve
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => toast({ title: "Marked for Review", description: "Marked for review" })}>
          Review
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//   MAIN DASHBOARD PAGE
// ═══════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  // Fetch leads count
  const { data: leadsData } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      try {
        const res = await api.get("/crm/leads?limit=1")
        return res.data
      } catch {
        return { total: 0, items: [] }
      }
    },
    staleTime: 30000,
  })

  // Fetch all projects for stats + progress section
  const { data: allProjectsData } = useQuery({
    queryKey: ["dashboard-projects-all"],
    queryFn: async () => {
      try {
        const res = await api.get("/projects?limit=50")
        return res.data
      } catch {
        return { total: 0, items: [] }
      }
    },
    staleTime: 30000,
  })

  // Derive stats from fetched data
  const allProjects: any[] = allProjectsData?.items ?? allProjectsData ?? []
  const totalLeads = leadsData?.total ?? leadsData?.items?.length ?? 0
  const activeProjects = allProjects.filter((p: any) => p.status === "IN_PROGRESS").length
  const overdueCount = allProjects.filter((p: any) =>
    p.expected_end_date &&
    new Date(p.expected_end_date) < new Date() &&
    p.status !== "COMPLETED"
  ).length
  const pendingPayments = allProjects.reduce((sum: number, p: any) => {
    const agreed = Number(p.total_project_value ?? 0)
    const received = Number(p.total_received ?? 0)
    return sum + Math.max(agreed - received, 0)
  }, 0)
  const totalRevenue = allProjects.reduce((sum: number, p: any) => sum + Number(p.total_received ?? 0), 0)

  const stats: DashboardStats = {
    total_leads: totalLeads,
    active_projects: activeProjects,
    pending_approvals: 0,
    purchase_requests: 0,
    overdue_projects: overdueCount,
    pending_payments: pendingPayments,
    total_revenue: totalRevenue,
    total_spent: allProjects.reduce((sum: number, p: any) => sum + Number(p.total_spent ?? 0), 0),
  }

  // Derive recent in-progress projects for progress section
  const projects = allProjects
    .filter((p: any) => p.status === "IN_PROGRESS")
    .slice(0, 3)

  // Fetch recent notifications for activity feed
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      try {
        const res = await api.get("/notifications?limit=5")
        return res.data.items ?? res.data ?? []
      } catch {
        return []
      }
    },
    staleTime: 30000,
  })

  // Map projects to progress items
  const projectProgress: ProjectProgress[] = projects.map((p: any) => {
    const totalSprints = p.sprints?.length || 6
    const completedSprints = p.sprints?.filter((s: any) => s.status === "COMPLETED").length || 0
    const progress = Math.round((completedSprints / totalSprints) * 100)
    const activeSprint = p.sprints?.find((s: any) => s.status === "ACTIVE")

    return {
      id: p.id,
      name: p.client?.user?.full_name || p.site_address || "Project",
      progress,
      phase: activeSprint?.name?.replace(/^Sprint \d+:\s*/, "") || "Planning",
      status: p.status === "IN_PROGRESS" ? "Active" : p.status === "ON_HOLD" ? "On Hold" : "Pending",
    }
  })

  // Fallback progress data if no projects exist
  const displayProjects = projectProgress.length > 0
    ? projectProgress
    : [
        { id: "1", name: "No active projects", progress: 0, phase: "—", status: "Pending" },
      ]

  // Map notifications to activity feed
  const activityFeed: ActivityItem[] = notifications.slice(0, 5).map((n: any) => {
    const typeMap: Record<string, ActivityItem["type"]> = {
      ALERT: "warning",
      APPROVAL_REQ: "info",
      INFO: "success",
      PAYMENT_RECEIVED: "success",
    }
    const createdAt = new Date(n.created_at)
    const now = new Date()
    const diffMs = now.getTime() - createdAt.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const timeStr =
      diffHours < 1
        ? "Just now"
        : diffHours < 24
          ? `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
          : `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? "s" : ""} ago`

    return {
      id: n.id,
      message: n.title || n.body || "Activity",
      time: timeStr,
      type: typeMap[n.type] || "info",
    }
  })

  // Stat values
  const statValues: Record<string, { value: string | number; subtitle?: string }> = {
    total_leads: { value: stats.total_leads ?? 0 },
    active_projects: { value: stats.active_projects ?? 0 },
    pending_approvals: { value: stats.pending_approvals ?? 0 },
    purchase_requests: { value: stats.purchase_requests ?? 0 },
    overdue_projects: { value: stats.overdue_projects ?? 0 },
    pending_payments: {
      value: formatCurrency(stats.pending_payments ?? 0),
    },
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your studio&apos;s pulse, track active projects, and manage ongoing operations.
          </p>
        </div>
        <Link href="/dashboard/sales/leads">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </Link>
      </div>

      {/* ── Stat Cards (6 in a row) ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STAT_CONFIGS.map((config, i) => (
          <StatCard
            key={config.key}
            title={config.title}
            value={statValues[config.key]?.value ?? 0}
            subtitle={statValues[config.key]?.subtitle}
            icon={config.icon}
            iconBg={config.iconBg}
            iconColor={config.iconColor}
            borderColor={config.borderColor}
            delay={i * 50}
            href={config.href}
          />
        ))}
      </div>

      {/* ── Project Progress + Pending Approvals ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Project Progress */}
        <div className="lg:col-span-7 rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Project Progress</h2>
            <Link
              href="/dashboard/projects"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            {displayProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="block hover:bg-slate-50/50 rounded-md transition-colors -mx-2 px-2"
              >
                <ProjectProgressBar {...project} />
              </Link>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="lg:col-span-5 rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <Badge variant="destructive" className="rounded-full h-6 w-6 p-0 flex items-center justify-center text-xs">
              {stats.pending_approvals ?? 2}
            </Badge>
          </div>
          <div className="space-y-3">
            {(stats.pending_approvals ?? 0) > 0 ? (
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You have {stats.pending_approvals} pending approval{(stats.pending_approvals ?? 0) !== 1 ? "s" : ""}.
                </p>
                <Link href="/dashboard/admin/approvals">
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                    View pending approvals <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                No pending approvals
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions + Activity Feed ── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Quick Actions */}
        <div className="lg:col-span-7 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            <QuickActionCard
              href="/dashboard/sales/leads/new"
              icon={UserPlus}
              label="Create Lead"
            />
            <QuickActionCard
              icon={Building2}
              label="Create Project"
              onClick={() => {
                toast({
                  title: "Project Workflow",
                  description: "Projects are created by converting approved quotations. Start by creating a lead.",
                })
                router.push("/dashboard/sales/leads/new")
              }}
            />
            <QuickActionCard
              href="/dashboard/sales/quotes/new"
              icon={FileText}
              label="Create Quotation"
            />
            <QuickActionCard
              href="/dashboard/purchasing"
              icon={ShoppingCart}
              label="Raise Purchase Request"
            />
            <QuickActionCard
              href="/dashboard/expenses"
              icon={Receipt}
              label="Add Expense"
            />
            <QuickActionCard
              icon={AlertOctagon}
              label="Report Issue"
              onClick={() => {
                toast({
                  title: "Report Issue",
                  description: "Use Execution Tracking to log site issues.",
                })
                router.push("/dashboard/execution-tracking")
              }}
            />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-5 rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Activity Feed</h2>
          </div>
          <div>
            {activityFeed.length > 0 ? (
              activityFeed.map((item) => (
                <ActivityFeedItem key={item.id} {...item} />
              ))
            ) : (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
          <Link
            href="/dashboard/notifications"
            className="mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 pt-3 border-t"
          >
            View Complete Log <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

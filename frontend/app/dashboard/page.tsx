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
  AlertOctagon,
  CreditCard,
  Plus,
  ArrowRight,
  UserPlus,
  Building2,
  FileText,
  Receipt,
  Phone,
  PhoneCall,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  CalendarCheck,
  HardHat,
  Hammer,
  ClipboardList,
  Package,
  IndianRupee,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import type { UserRole } from "@/types"

// ── Helpers ──

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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
  href,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  borderColor: string
  href?: string
}) {
  const content = (
    <div className={cn("rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-md", borderColor, href && "cursor-pointer")}>
      <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

// ── Quick Action Card ──

function QuickActionCard({ href, icon: Icon, label, onClick }: {
  href?: string; icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void
}) {
  const content = (
    <div className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 bg-white p-6 text-center transition-all hover:border-blue-200 hover:shadow-md cursor-pointer">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-blue-50">
        <Icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
  if (onClick) return <div onClick={onClick}>{content}</div>
  return href ? <Link href={href}>{content}</Link> : content
}

// ── Activity Feed Item ──

function ActivityItem({ message, time, type }: { message: string; time: string; type: string }) {
  const dotColor = { info: "bg-blue-500", success: "bg-emerald-500", warning: "bg-amber-500", error: "bg-red-500" }[type] ?? "bg-slate-400"
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

// ── Progress Bar ──

function ProgressBar({ name, progress, phase, href }: { name: string; progress: number; phase: string; href: string }) {
  return (
    <Link href={href} className="block hover:bg-slate-50/50 rounded-md transition-colors -mx-2 px-2">
      <div className="space-y-2 py-3 border-b last:border-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{phase}</span>
      </div>
    </Link>
  )
}

// ════════════════════════════════════════════════
//   ROLE-SPECIFIC DASHBOARD SECTIONS
// ════════════════════════════════════════════════

// ── Sales / BDE Dashboard ──

function SalesDashboard({ leads, notifications }: { leads: any; notifications: any[] }) {
  const allLeads: any[] = leads?.items ?? leads ?? []
  const totalLeads = leads?.total ?? allLeads.length
  const newLeads = allLeads.filter((l: any) => l.status === "NEW").length
  const contacted = allLeads.filter((l: any) => l.status === "CONTACTED").length
  const qualified = allLeads.filter((l: any) => l.status === "QUALIFIED").length
  const quoteSent = allLeads.filter((l: any) => l.status === "QUOTATION_SENT").length
  const converted = allLeads.filter((l: any) => l.status === "CONVERTED").length
  const lost = allLeads.filter((l: any) => l.status === "LOST").length
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0

  // Leads needing follow-up: NEW or CONTACTED but not updated in 2+ days
  const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
  const needsFollowUp = allLeads.filter(
    (l: any) => ["NEW", "CONTACTED"].includes(l.status) && new Date(l.updated_at).getTime() < twoDaysAgo
  ).length

  // Recently touched today
  const today = new Date().toISOString().slice(0, 10)
  const touchedToday = allLeads.filter(
    (l: any) => l.updated_at?.startsWith(today)
  ).length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Leads" value={totalLeads} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" borderColor="border-blue-100" href="/dashboard/sales/leads" />
        <StatCard title="Needs Follow-up" value={needsFollowUp} subtitle="Not contacted in 2+ days" icon={PhoneCall} iconBg="bg-red-50" iconColor="text-red-500" borderColor="border-red-100" href="/dashboard/sales/leads" />
        <StatCard title="Followed Up Today" value={touchedToday} icon={CalendarCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" borderColor="border-emerald-100" />
        <StatCard title="Quotes Sent" value={quoteSent} icon={FileText} iconBg="bg-violet-50" iconColor="text-violet-600" borderColor="border-violet-100" href="/dashboard/sales/quotes" />
        <StatCard title="Conversion Rate" value={`${conversionRate}%`} subtitle={`${converted} of ${totalLeads}`} icon={Target} iconBg="bg-amber-50" iconColor="text-amber-600" borderColor="border-amber-100" />
      </div>

      {/* Pipeline + Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Lead Pipeline</h2>
          <div className="space-y-3">
            {[
              { label: "New", count: newLeads, color: "bg-blue-500" },
              { label: "Contacted", count: contacted, color: "bg-purple-500" },
              { label: "Qualified", count: qualified, color: "bg-amber-500" },
              { label: "Quote Sent", count: quoteSent, color: "bg-cyan-500" },
              { label: "Converted", count: converted, color: "bg-emerald-500" },
              { label: "Lost", count: lost, color: "bg-red-400" },
            ].map((stage) => (
              <div key={stage.label} className="flex items-center gap-3">
                <span className="w-24 text-sm text-muted-foreground">{stage.label}</span>
                <div className="flex-1 h-6 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", stage.color)}
                    style={{ width: totalLeads > 0 ? `${(stage.count / totalLeads) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-semibold">{stage.count}</span>
              </div>
            ))}
          </div>
        </div>
        <ActivitySection notifications={notifications} />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          <QuickActionCard href="/dashboard/sales/leads/new" icon={UserPlus} label="New Lead" />
          <QuickActionCard href="/dashboard/sales/quotes/new" icon={FileText} label="New Quotation" />
          <QuickActionCard href="/dashboard/sales/leads" icon={Phone} label="Follow-up Leads" />
          <QuickActionCard href="/dashboard/sales/quotes" icon={ClipboardList} label="View Quotes" />
        </div>
      </div>
    </div>
  )
}

// ── Supervisor Dashboard ──

function SupervisorDashboard({ projects, notifications }: { projects: any[]; notifications: any[] }) {
  const activeProjects = projects.filter((p: any) => p.status === "IN_PROGRESS")
  const totalAssigned = projects.length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Assigned Projects" value={totalAssigned} icon={FolderKanban} iconBg="bg-blue-50" iconColor="text-blue-600" borderColor="border-blue-100" href="/dashboard/projects" />
        <StatCard title="Active Now" value={activeProjects.length} icon={HardHat} iconBg="bg-emerald-50" iconColor="text-emerald-600" borderColor="border-emerald-100" href="/dashboard/projects" />
        <StatCard title="Pending Logs" value={0} subtitle="Submit daily updates" icon={ClipboardList} iconBg="bg-amber-50" iconColor="text-amber-600" borderColor="border-amber-100" />
        <StatCard title="Material Requests" value={0} subtitle="Raise indent" icon={Package} iconBg="bg-violet-50" iconColor="text-violet-600" borderColor="border-violet-100" />
      </div>

      {/* Active Projects + Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">My Projects</h2>
            <Link href="/dashboard/projects" className="text-sm text-blue-600 flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {activeProjects.length > 0 ? activeProjects.slice(0, 5).map((p: any) => {
            const totalSprints = p.sprints?.length || 6
            const completed = p.sprints?.filter((s: any) => s.status === "COMPLETED").length || 0
            const progress = Math.round((completed / totalSprints) * 100)
            const activeSprint = p.sprints?.find((s: any) => s.status === "ACTIVE")
            return (
              <ProgressBar
                key={p.id}
                name={p.client?.lead?.name || p.name || "Project"}
                progress={progress}
                phase={activeSprint?.name?.replace(/^Sprint \d+:\s*/, "") || "Planning"}
                href={`/dashboard/projects/${p.id}`}
              />
            )
          }) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No active projects assigned</p>
          )}
        </div>
        <ActivitySection notifications={notifications} />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3">
          <QuickActionCard href="/dashboard/projects" icon={FolderKanban} label="View Projects" />
          <QuickActionCard href="/dashboard/labour" icon={Hammer} label="Log Attendance" />
          <QuickActionCard icon={Package} label="Raise Material Request" onClick={() => toast({ title: "Material Request", description: "Go to a project and use the Indent tab to raise a material request." })} />
        </div>
      </div>
    </div>
  )
}

// ── Manager / Super Admin Dashboard ──

function AdminDashboard({ leads, projects, notifications }: { leads: any; projects: any[]; notifications: any[] }) {
  const router = useRouter()
  const totalLeads = leads?.total ?? (leads?.items?.length ?? 0)
  const activeProjects = projects.filter((p: any) => p.status === "IN_PROGRESS").length
  const overdueCount = projects.filter((p: any) =>
    p.expected_end_date && new Date(p.expected_end_date) < new Date() && p.status !== "COMPLETED"
  ).length
  const pendingPayments = projects.reduce((sum: number, p: any) => {
    const agreed = Number(p.total_project_value ?? 0)
    const received = Number(p.wallet?.total_received ?? 0)
    return sum + Math.max(agreed - received, 0)
  }, 0)
  const totalRevenue = projects.reduce((sum: number, p: any) => sum + Number(p.wallet?.total_received ?? 0), 0)
  const totalSpent = projects.reduce((sum: number, p: any) => sum + Number(p.wallet?.total_spent ?? 0), 0)

  const inProgressProjects = projects.filter((p: any) => p.status === "IN_PROGRESS").slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard title="Total Leads" value={totalLeads} icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600" borderColor="border-blue-100" href="/dashboard/sales/leads" />
        <StatCard title="Active Projects" value={activeProjects} icon={FolderKanban} iconBg="bg-emerald-50" iconColor="text-emerald-600" borderColor="border-emerald-100" href="/dashboard/projects" />
        <StatCard title="Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} iconBg="bg-green-50" iconColor="text-green-600" borderColor="border-green-100" />
        <StatCard title="Total Spent" value={formatCurrency(totalSpent)} icon={IndianRupee} iconBg="bg-orange-50" iconColor="text-orange-600" borderColor="border-orange-100" />
        <StatCard title="Overdue Projects" value={overdueCount} icon={AlertOctagon} iconBg="bg-red-50" iconColor="text-red-500" borderColor="border-red-100" href="/dashboard/projects" />
        <StatCard title="Pending Payments" value={formatCurrency(pendingPayments)} icon={CreditCard} iconBg="bg-violet-50" iconColor="text-violet-600" borderColor="border-violet-100" />
      </div>

      {/* Project Progress + Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Project Progress</h2>
            <Link href="/dashboard/projects" className="text-sm text-blue-600 flex items-center gap-1">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {inProgressProjects.length > 0 ? inProgressProjects.map((p: any) => {
            const totalSprints = p.sprints?.length || 6
            const completed = p.sprints?.filter((s: any) => s.status === "COMPLETED").length || 0
            const progress = Math.round((completed / totalSprints) * 100)
            const activeSprint = p.sprints?.find((s: any) => s.status === "ACTIVE")
            return (
              <ProgressBar
                key={p.id}
                name={p.client?.lead?.name || p.name || "Project"}
                progress={progress}
                phase={activeSprint?.name?.replace(/^Sprint \d+:\s*/, "") || "Planning"}
                href={`/dashboard/projects/${p.id}`}
              />
            )
          }) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No active projects</p>
          )}
        </div>
        <ActivitySection notifications={notifications} />
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          <QuickActionCard href="/dashboard/sales/leads/new" icon={UserPlus} label="New Lead" />
          <QuickActionCard href="/dashboard/sales/quotes/new" icon={FileText} label="New Quote" />
          <QuickActionCard icon={Building2} label="New Project" onClick={() => { toast({ title: "Workflow", description: "Create a lead → quote → approve → convert to project" }); router.push("/dashboard/sales/leads/new") }} />
          <QuickActionCard href="/dashboard/admin/inventory" icon={Package} label="Inventory" />
          <QuickActionCard href="/dashboard/admin/approvals" icon={ClipboardCheck} label="Approvals" />
          <QuickActionCard href="/dashboard/finance/reports" icon={Receipt} label="Reports" />
        </div>
      </div>
    </div>
  )
}

// ── Activity Section (shared) ──

function ActivitySection({ notifications }: { notifications: any[] }) {
  const feed = notifications.slice(0, 5).map((n: any) => ({
    id: n.id,
    message: n.title || n.body || "Activity",
    time: timeAgo(n.created_at),
    type: { ALERT: "warning", APPROVAL_REQ: "info", INFO: "success", PAYMENT_RECEIVED: "success" }[n.type as string] ?? "info",
  }))

  return (
    <div className="lg:col-span-5 rounded-xl border bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold">Activity Feed</h2>
      </div>
      {feed.length > 0 ? (
        feed.map((item) => <ActivityItem key={item.id} {...item} />)
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
      )}
      <Link href="/dashboard/notifications" className="mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 pt-3 border-t">
        View All <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

// ════════════════════════════════════════════════
//   MAIN DASHBOARD PAGE
// ════════════════════════════════════════════════

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const roleInOrg = useAuthStore((s) => s.roleInOrg)
  const role = roleInOrg ?? user?.role ?? "SALES"

  const isSales = role === "BDE" || role === "SALES"
  const isSupervisor = role === "SUPERVISOR"
  const isAdmin = role === "SUPER_ADMIN" || role === "MANAGER"

  // Fetch leads (for Sales + Admin)
  const { data: leadsData } = useQuery({
    queryKey: ["dashboard-leads"],
    queryFn: async () => {
      const res = await api.get("/crm/leads?limit=200")
      return res.data
    },
    staleTime: 30000,
    enabled: isSales || isAdmin,
  })

  // Fetch projects (for all except pure sales)
  const { data: projectsData } = useQuery({
    queryKey: ["dashboard-projects-all"],
    queryFn: async () => {
      const res = await api.get("/projects?limit=50")
      return res.data
    },
    staleTime: 30000,
  })

  // Fetch notifications (for all)
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["dashboard-notifications"],
    queryFn: async () => {
      try {
        const res = await api.get("/notifications?limit=5")
        return res.data.items ?? res.data ?? []
      } catch { return [] }
    },
    staleTime: 30000,
  })

  const allProjects: any[] = projectsData?.items ?? projectsData ?? []
  const firstName = user?.full_name?.split(" ")[0] ?? "there"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSales && "Track your leads, follow-ups, and conversions."}
            {isSupervisor && "Monitor your projects, log progress, and manage site work."}
            {isAdmin && "Overview of your studio operations, projects, and financials."}
          </p>
        </div>
        {(isSales || isAdmin) && (
          <Link href="/dashboard/sales/leads/new">
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Lead</Button>
          </Link>
        )}
      </div>

      {/* Role-specific dashboard */}
      {isSales && <SalesDashboard leads={leadsData} notifications={notifications} />}
      {isSupervisor && <SupervisorDashboard projects={allProjects} notifications={notifications} />}
      {isAdmin && <AdminDashboard leads={leadsData} projects={allProjects} notifications={notifications} />}
    </div>
  )
}

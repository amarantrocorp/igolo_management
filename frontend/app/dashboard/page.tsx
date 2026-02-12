"use client"

import { useAuthStore } from "@/store/auth-store"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  FolderKanban,
  FileText,
  DollarSign,
  TrendingUp,
  ClipboardCheck,
  Clock,
  AlertCircle,
} from "lucide-react"
import type { UserRole } from "@/types"
import { GlowCard } from "@/components/ui/aceternity/moving-border"

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

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: string
}) {
  return (
    <GlowCard>
      <div className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="rounded-md bg-gold/10 p-2">
          <Icon className="h-4 w-4 text-gold" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold font-serif">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs text-green-500">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </div>
    </GlowCard>
  )
}

function AdminManagerDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your interior design business
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Leads", value: stats.total_leads ?? 0, description: "Active leads in pipeline", icon: Users, trend: "+12% from last month" },
          { title: "Active Projects", value: stats.active_projects ?? 0, description: "Projects in progress", icon: FolderKanban },
          { title: "Pending Approvals", value: stats.pending_approvals ?? 0, description: "Awaiting your action", icon: ClipboardCheck },
          { title: "Revenue", value: `₹ ${(stats.total_revenue ?? 0).toLocaleString()}`, description: "Total received this month", icon: DollarSign, trend: "+8% from last month" },
        ].map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Financial Overview</CardTitle>
            <CardDescription>Month-to-date summary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Total Received
              </span>
              <span className="font-semibold text-green-600">
                ₹{(stats.total_revenue ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Spent</span>
              <span className="font-semibold text-red-600">
                ₹{(stats.total_spent ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Net Balance</span>
                <span className="font-bold">
                  ₹{(
                    (stats.total_revenue ?? 0) - (stats.total_spent ?? 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-gold/30 hover:bg-gold/5">
              <AlertCircle className="h-4 w-4 text-warning" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {stats.pending_approvals ?? 0} items need approval
                </p>
                <p className="text-xs text-muted-foreground">
                  Purchase orders and payment requests
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:border-gold/30 hover:bg-gold/5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {stats.active_projects ?? 0} active projects
                </p>
                <p className="text-xs text-muted-foreground">
                  Check sprint progress and timelines
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SalesBdeDashboard({ stats }: { stats: DashboardStats }) {
  const cards = [
    { title: "My Leads", value: stats.my_leads ?? 0, description: "Leads assigned to you", icon: Users },
    { title: "Quotes Sent", value: stats.quotes_sent ?? 0, description: "Quotations pending response", icon: FileText },
    {
      title: "Conversion Rate",
      value: stats.my_leads && stats.my_leads > 0
        ? `${Math.round(((stats.quotes_sent ?? 0) / stats.my_leads) * 100)}%`
        : "0%",
      description: "Leads to quote ratio",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight">Sales Dashboard</h2>
        <p className="text-muted-foreground">
          Track your leads and quotation progress
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Recent Activity</CardTitle>
          <CardDescription>Your latest lead interactions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No recent activity to display. Start by creating a new lead or
            following up on existing ones.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SupervisorDashboard({ stats }: { stats: DashboardStats }) {
  const cards = [
    { title: "Active Projects", value: stats.active_projects ?? 0, description: "Assigned to you", icon: FolderKanban },
    { title: "Today's Tasks", value: stats.todays_tasks ?? 0, description: "Tasks to complete today", icon: ClipboardCheck },
    { title: "Pending Logs", value: 0, description: "Daily logs awaiting submission", icon: Clock },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          Supervisor Dashboard
        </h2>
        <p className="text-muted-foreground">
          Track on-site progress and daily tasks
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Today&apos;s Schedule</CardTitle>
          <CardDescription>Tasks and site visits for today</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tasks scheduled for today. Check your project sprints for
            upcoming deliverables.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ClientDashboard({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold tracking-tight">My Project</h2>
        <p className="text-muted-foreground">
          Track the progress of your interior design project
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Project Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={stats.project_status === "IN_PROGRESS" ? "default" : "secondary"}>
              {stats.project_status?.replace("_", " ") ?? "NOT STARTED"}
            </Badge>
          </div>
          {stats.project_progress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{stats.project_progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-gold transition-all duration-1000 ease-out"
                  style={{ width: `${stats.project_progress}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Visit the Client Portal to see detailed sprint progress, daily logs,
            and payment history.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  // TODO: Wire up to a real /dashboard/stats endpoint when available
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

  const welcomeMessage = user ? `Welcome back, ${user.full_name}` : "Welcome"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-lg text-muted-foreground">{welcomeMessage}</p>
        <Badge variant="outline" className="border-gold/30 text-gold">
          {role?.replace("_", " ")}
        </Badge>
      </div>

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

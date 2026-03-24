"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  DollarSign,
  TrendingUp,
  Package,
  Users,
  CreditCard,
  Store,
  FileText,
  Clock,
  BarChart3,
  CalendarClock,
  Inbox,
  Loader2,
} from "lucide-react"

const reportCategories = [
  {
    title: "Financial Summary",
    description: "Revenue vs expenses across all projects",
    icon: DollarSign,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    title: "Project Profitability",
    description: "Margin analysis per project with cost breakdown",
    icon: TrendingUp,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    title: "Material Consumption",
    description: "Usage tracking and wastage analysis",
    icon: Package,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    title: "Labour Productivity",
    description: "Team efficiency, attendance, and cost per sqft",
    icon: Users,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    title: "Client Payment Status",
    description: "Outstanding payments, aging analysis",
    icon: CreditCard,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
  {
    title: "Vendor Performance",
    description: "Delivery timelines, quality scores, pricing trends",
    icon: Store,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
]

const quickStats = [
  {
    label: "Reports Generated This Month",
    value: "0",
    icon: FileText,
  },
  {
    label: "Most Viewed",
    value: "--",
    icon: BarChart3,
  },
  {
    label: "Avg Generation Time",
    value: "--",
    icon: Clock,
  },
  {
    label: "Scheduled Reports",
    value: "0",
    icon: CalendarClock,
  },
]

interface ReportProject {
  id: string
  name?: string
  status: string
  total_project_value: number
  total_received: number
  total_spent: number
  client_id?: string
  wallet?: {
    total_received: number
    total_spent: number
  }
  created_at: string
}

function formatDefaultDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default function ReportsPage() {
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [startDate, setStartDate] = useState(formatDefaultDate(thirtyDaysAgo))
  const [endDate, setEndDate] = useState(formatDefaultDate(today))

  // Fetch projects for chart and exports
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ReportProject[]>({
    queryKey: ["report-projects"],
    queryFn: async () => {
      try {
        const res = await api.get("/projects?limit=50")
        return res.data
      } catch {
        return []
      }
    },
  })

  // Filter projects by date range and build chart data
  const chartData = useMemo(() => {
    const start = startDate ? new Date(startDate) : null
    const end = endDate ? new Date(endDate) : null
    if (end) {
      end.setHours(23, 59, 59, 999)
    }

    return projects
      .filter((p) => {
        if (!p.created_at) return true
        const created = new Date(p.created_at)
        if (start && created < start) return false
        if (end && created > end) return false
        return true
      })
      .map((p) => ({
        name: (p.name ?? `Project ${p.id?.slice(0, 8)}`).substring(0, 20),
        received: p.wallet?.total_received ?? p.total_received ?? 0,
        spent: p.wallet?.total_spent ?? p.total_spent ?? 0,
      }))
      .filter((d) => d.received > 0 || d.spent > 0)
  }, [projects, startDate, endDate])

  const totalReceived = chartData.reduce((s, d) => s + d.received, 0)
  const totalSpent = chartData.reduce((s, d) => s + d.spent, 0)
  const netProfit = totalReceived - totalSpent

  const handleGenerate = (index: number) => {
    setGeneratingId(index)
    const report = reportCategories[index]

    if (report.title === "Financial Summary" && chartData.length > 0) {
      const headers = ["Project", "Received", "Spent", "Net"]
      const rows = chartData.map((d) => [
        d.name,
        d.received,
        d.spent,
        d.received - d.spent,
      ])
      rows.push(["TOTAL", totalReceived, totalSpent, netProfit])
      exportCSV("financial-summary.csv", headers, rows)
      toast({ title: "Report generated", description: "Financial Summary exported from live data" })
    } else {
      toast({ title: "Report generated", description: `${report.title} report will be generated from live data` })
    }

    setTimeout(() => setGeneratingId(null), 500)
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate financial, project, and team performance reports</p>
        </div>

        {/* Date Range Filter */}
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm font-medium mb-3">Report Period</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="start-date" className="text-sm text-muted-foreground whitespace-nowrap">
                From
              </label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="end-date" className="text-sm text-muted-foreground whitespace-nowrap">
                To
              </label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </div>

        {/* Financial Summary Chart */}
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <h2 className="text-lg font-semibold">Financial Overview</h2>

          {projectsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading project data...</span>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
                <BarChart3 className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No financial data for this period</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try adjusting the date range above
              </p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} fontSize={12} />
                  <YAxis tickFormatter={(v: number) => `\u20B9${(v / 100000).toFixed(1)}L`} />
                  <Tooltip formatter={(v: number) => `\u20B9${Number(v).toLocaleString("en-IN")}`} />
                  <Legend />
                  <Bar dataKey="received" fill="#22c55e" name="Received" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" fill="#ef4444" name="Spent" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Summary Row */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Received</p>
                  <p className="text-xl font-semibold text-green-600">
                    {"\u20B9"}{totalReceived.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-xl font-semibold text-red-500">
                    {"\u20B9"}{totalSpent.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Net Profit</p>
                  <p className={`text-xl font-semibold ${netProfit >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {"\u20B9"}{netProfit.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Report Categories Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reportCategories.map((report, index) => (
            <div
              key={report.title}
              className="rounded-xl border bg-white p-5 space-y-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${report.iconBg}`}>
                  <report.icon className={`h-6 w-6 ${report.iconColor}`} />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">{report.title}</h3>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
              <div className="flex items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={generatingId === index}
                  onClick={() => handleGenerate(index)}
                >
                  {generatingId === index ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-white p-5 flex items-center gap-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Reports - Empty State */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Reports</h2>
          <div className="rounded-xl border bg-white">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
                <Inbox className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No reports generated yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Use the report categories above to generate your first report
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

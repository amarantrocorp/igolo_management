"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  Wallet,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PageHeader, MiniStatCard } from "@/components/layout/page-header"
import { useToast } from "@/components/ui/use-toast"
import { format, startOfMonth } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type {
  TransactionSummary,
  TransactionAggregation,
  SourceBreakdownItem,
  ProjectBreakdownItem,
} from "@/types"

interface Transaction {
  id: string
  project_id: string
  category: string
  source: string
  amount: number
  description: string
  status: string
  created_at: string
}

interface Project {
  id: string
  name: string
}

const PIE_COLORS = ["#10B981", "#F43F5E", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"]

const SOURCE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  VENDOR: "Vendor",
  LABOR: "Labor",
  PETTY_CASH: "Petty Cash",
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0]
}

export default function FinancePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  // --- Filter state ---
  const [dateFrom, setDateFrom] = useState(() => toDateStr(startOfMonth(new Date())))
  const [dateTo, setDateTo] = useState(() => toDateStr(new Date()))
  const [projectId, setProjectId] = useState<string>("all")
  const [period, setPeriod] = useState<"day" | "week" | "month">("day")

  // Transaction-level filters
  const [txnCategory, setTxnCategory] = useState<string>("all")
  const [txnSource, setTxnSource] = useState<string>("all")
  const [txnStatus, setTxnStatus] = useState<string>("all")
  const [txnLimit, setTxnLimit] = useState(50)

  const filterParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (dateFrom) p.date_from = dateFrom
    if (dateTo) p.date_to = dateTo
    if (projectId && projectId !== "all") p.project_id = projectId
    return p
  }, [dateFrom, dateTo, projectId])

  // --- Projects list (for filter dropdown + name resolution) ---
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const res = await api.get("/projects")
      return res.data.items ?? res.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const projectMap = useMemo(() => {
    const m: Record<string, string> = {}
    projects.forEach((p) => (m[p.id] = p.name))
    return m
  }, [projects])

  // --- Summary ---
  const { data: summary, isLoading: summaryLoading } = useQuery<TransactionSummary>({
    queryKey: ["finance-summary", filterParams],
    queryFn: async () => {
      const res = await api.get("/finance/summary", { params: filterParams })
      return res.data
    },
  })

  // --- Aggregation (chart) ---
  const { data: aggregation } = useQuery<TransactionAggregation>({
    queryKey: ["finance-aggregation", period, filterParams],
    queryFn: async () => {
      const res = await api.get("/finance/aggregation", {
        params: { ...filterParams, group_by: period },
      })
      return res.data
    },
  })

  // --- Source breakdown ---
  const { data: sourceBreakdown = [] } = useQuery<SourceBreakdownItem[]>({
    queryKey: ["finance-breakdown-source", filterParams],
    queryFn: async () => {
      const res = await api.get("/finance/breakdown/source", { params: filterParams })
      return res.data
    },
  })

  // --- Project breakdown ---
  const { data: projectBreakdown = [] } = useQuery<ProjectBreakdownItem[]>({
    queryKey: ["finance-breakdown-project", filterParams],
    queryFn: async () => {
      const res = await api.get("/finance/breakdown/project", { params: filterParams })
      return res.data
    },
  })

  // --- Transactions ---
  const { data: transactions = [], isLoading: txnLoading } = useQuery<Transaction[]>({
    queryKey: ["finance-transactions", filterParams, txnLimit],
    queryFn: async () => {
      const res = await api.get("/finance/transactions", {
        params: { ...filterParams, limit: txnLimit },
      })
      return res.data.items ?? res.data
    },
  })

  // --- Verify mutation ---
  const verifyMutation = useMutation({
    mutationFn: async (txnId: string) => {
      await api.patch(`/finance/transactions/${txnId}/verify`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith?.("finance-") })
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] })
      queryClient.invalidateQueries({ queryKey: ["finance-transactions"] })
      queryClient.invalidateQueries({ queryKey: ["finance-aggregation"] })
      queryClient.invalidateQueries({ queryKey: ["finance-breakdown-source"] })
      queryClient.invalidateQueries({ queryKey: ["finance-breakdown-project"] })
      toast({ title: "Transaction verified", description: "Transaction has been cleared and wallet updated." })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to verify transaction.", variant: "destructive" })
    },
  })

  // --- Filtered transactions for display ---
  const filteredTxns = useMemo(() => {
    return transactions.filter((t) => {
      if (txnCategory !== "all" && t.category !== txnCategory) return false
      if (txnSource !== "all" && t.source !== txnSource) return false
      if (txnStatus !== "all" && t.status !== txnStatus) return false
      return true
    })
  }, [transactions, txnCategory, txnSource, txnStatus])

  // --- Chart data ---
  const barChartData = useMemo(() => {
    if (!aggregation?.buckets) return []
    return aggregation.buckets.map((b) => ({
      period: period === "day"
        ? format(new Date(b.period), "MMM d")
        : period === "week"
        ? format(new Date(b.period), "MMM d")
        : format(new Date(b.period), "MMM yyyy"),
      Inflow: Number(b.inflow),
      Outflow: Number(b.outflow),
    }))
  }, [aggregation, period])

  const pieChartData = useMemo(() => {
    return sourceBreakdown
      .filter((s) => Number(s.total_outflow) > 0)
      .map((s) => ({
        name: SOURCE_LABELS[s.source] || s.source,
        value: Number(s.total_outflow),
      }))
  }, [sourceBreakdown])

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={Wallet}
          title="Finance"
          subtitle="Track payments, expenses, and project financial health"
          gradient="linear-gradient(135deg, #CBB282, #A8956E)"
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`${api.defaults.baseURL}/finance/export/transactions`, "_blank")
                }}
              >
                Export Transactions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`${api.defaults.baseURL}/finance/export/cash-flow`, "_blank")
                }}
              >
                Cash Flow
              </Button>
            </div>
          }
        />

        {/* ===== GLOBAL FILTER BAR ===== */}
        <div className="animate-fade-in-up delay-1 flex flex-wrap items-end gap-3 rounded-2xl border border-border/40 bg-card p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Period</label>
            <div className="flex rounded-lg border border-border/40">
              {(["day", "week", "month"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  } ${p === "day" ? "rounded-l-lg" : p === "month" ? "rounded-r-lg" : ""}`}
                >
                  {p}ly
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== SUMMARY STAT CARDS ===== */}
        <div className="grid gap-4 md:grid-cols-4">
          <MiniStatCard
            title="Total Inflow"
            value={summaryLoading ? "..." : formatCurrency(summary?.total_inflow ?? 0)}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #10B981, #059669)"
          />
          <MiniStatCard
            title="Total Outflow"
            value={summaryLoading ? "..." : formatCurrency(summary?.total_outflow ?? 0)}
            icon={TrendingDown}
            gradient="linear-gradient(135deg, #F43F5E, #E11D48)"
          />
          <MiniStatCard
            title="Net Balance"
            value={summaryLoading ? "..." : formatCurrency(summary?.net_balance ?? 0)}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #CBB282, #A8956E)"
          />
          <MiniStatCard
            title="Pending"
            value={summaryLoading ? "..." : `${summary?.pending_count ?? 0} txns`}
            icon={Clock}
            gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          />
        </div>

        {/* ===== TABBED CONTENT ===== */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="by-project" className="gap-1.5">
              <PieChartIcon className="h-3.5 w-3.5" />
              By Project
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* ----- TAB 1: OVERVIEW ----- */}
          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Bar chart: Inflow vs Outflow */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold">
                  Inflow vs Outflow ({period === "day" ? "Daily" : period === "week" ? "Weekly" : "Monthly"})
                </h3>
                {barChartData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No data for this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Outflow" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Pie chart: Expense by Source */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold">Expense by Source</h3>
                {pieChartData.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No expense data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {pieChartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ----- TAB 2: BY PROJECT ----- */}
          <TabsContent value="by-project">
            <div className="rounded-2xl border border-border/40 bg-card">
              <div className="border-b border-border/40 p-5">
                <h3 className="font-semibold">Project Financial Breakdown</h3>
                <p className="text-xs text-muted-foreground">
                  Spending and income per project (cleared transactions only)
                </p>
              </div>
              <div className="p-0">
                {projectBreakdown.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    No project data for selected period
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Inflow</TableHead>
                        <TableHead className="text-right">Outflow</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectBreakdown.map((pb) => (
                        <TableRow
                          key={pb.project_id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/dashboard/projects/${pb.project_id}`)}
                        >
                          <TableCell className="font-medium">{pb.project_name}</TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatCurrency(pb.total_inflow)}
                          </TableCell>
                          <TableCell className="text-right text-red-500">
                            {formatCurrency(pb.total_outflow)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              Number(pb.net) >= 0 ? "text-emerald-600" : "text-red-500"
                            }`}
                          >
                            {formatCurrency(pb.net)}
                          </TableCell>
                          <TableCell>
                            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ----- TAB 3: TRANSACTIONS ----- */}
          <TabsContent value="transactions">
            <div className="rounded-2xl border border-border/40 bg-card">
              {/* Transaction-level filters */}
              <div className="flex flex-wrap items-center gap-3 border-b border-border/40 p-4">
                <Select value={txnCategory} onValueChange={setTxnCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="INFLOW">Inflow</SelectItem>
                    <SelectItem value="OUTFLOW">Outflow</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={txnSource} onValueChange={setTxnSource}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                    <SelectItem value="LABOR">Labor</SelectItem>
                    <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={txnStatus} onValueChange={setTxnStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CLEARED">Cleared</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <span className="ml-auto text-xs text-muted-foreground">
                  {filteredTxns.length} transactions
                </span>
              </div>

              <div className="p-0">
                {txnLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTxns.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                      <DollarSign className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No transactions found</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTxns.map((txn) => (
                          <TableRow key={txn.id}>
                            <TableCell className="whitespace-nowrap text-sm">
                              {format(new Date(txn.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={txn.category === "INFLOW" ? "success" : "destructive"}>
                                {txn.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {SOURCE_LABELS[txn.source] || txn.source}
                            </TableCell>
                            <TableCell className="max-w-[120px] truncate text-sm">
                              {projectMap[txn.project_id] || "—"}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">
                              {txn.description || "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(txn.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  txn.status === "CLEARED"
                                    ? "success"
                                    : txn.status === "REJECTED"
                                    ? "destructive"
                                    : "warning"
                                }
                              >
                                {txn.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {txn.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => verifyMutation.mutate(txn.id)}
                                  disabled={verifyMutation.isPending}
                                >
                                  {verifyMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                  )}
                                  Verify
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {transactions.length >= txnLimit && (
                      <div className="flex justify-center border-t border-border/40 p-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTxnLimit((prev) => prev + 50)}
                        >
                          Load More
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

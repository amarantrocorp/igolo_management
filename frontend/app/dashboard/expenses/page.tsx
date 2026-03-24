"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DollarSign,
  Download,
  Plus,
  Search,
  Users,
  Wallet,
  Receipt,
  FileText,
  X,
  Loader2,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getSourceBadge(source: string) {
  const colors: Record<string, string> = {
    VENDOR: "bg-blue-100 text-blue-700",
    LABOR: "bg-purple-100 text-purple-700",
    PETTY_CASH: "bg-orange-100 text-orange-700",
    CLIENT: "bg-green-100 text-green-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[source] || "bg-gray-100 text-gray-700"}`}>
      {source.replace(/_/g, " ")}
    </span>
  )
}

function getStatusBadge(status: string) {
  switch (status) {
    case "CLEARED":
      return <Badge variant="success">Cleared</Badge>
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ExpensesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [statusFilterVal, setStatusFilterVal] = useState("all")
  const [showAddForm, setShowAddForm] = useState(false)

  // Add Expense form state
  const [expDesc, setExpDesc] = useState("")
  const [expProjectId, setExpProjectId] = useState("")
  const [expSource, setExpSource] = useState("VENDOR")
  const [expAmount, setExpAmount] = useState("")

  // Fetch outflow transactions (expenses)
  const { data: transactions = [], isLoading, isError } = useQuery({
    queryKey: ["finance-transactions-outflow"],
    queryFn: async () => {
      const res = await api.get("/finance/transactions?category=OUTFLOW")
      return res.data
    },
  })

  // Fetch projects for the form dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-expenses"],
    queryFn: async () => {
      const res = await api.get("/projects")
      return res.data
    },
  })

  // Fetch finance summary for stat cards
  const { data: financeSummary } = useQuery({
    queryKey: ["finance-summary-expenses"],
    queryFn: async () => {
      const res = await api.get("/finance/summary")
      return res.data
    },
  })

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/finance/transactions", payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-transactions-outflow"] })
      queryClient.invalidateQueries({ queryKey: ["finance-summary-expenses"] })
      toast({ title: "Expense recorded", description: `${formatCurrency(Number(expAmount))} - ${expDesc}` })
      setExpDesc(""); setExpAmount(""); setExpProjectId(""); setExpSource("VENDOR"); setShowAddForm(false)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || "Failed to record expense"
      toast({ title: "Error", description: detail, variant: "destructive" })
    },
  })

  // Compute stat cards from real data
  const stats = useMemo(() => {
    const totalOutflow = financeSummary ? Number(financeSummary.total_outflow) : 0
    const pendingOutflow = financeSummary ? Number(financeSummary.pending_outflow) : 0

    const vendorTotal = transactions
      .filter((t: any) => t.source === "VENDOR")
      .reduce((acc: number, t: any) => acc + Number(t.amount), 0)
    const laborTotal = transactions
      .filter((t: any) => t.source === "LABOR")
      .reduce((acc: number, t: any) => acc + Number(t.amount), 0)
    const pettyTotal = transactions
      .filter((t: any) => t.source === "PETTY_CASH")
      .reduce((acc: number, t: any) => acc + Number(t.amount), 0)

    return { totalOutflow, pendingOutflow, vendorTotal, laborTotal, pettyTotal }
  }, [transactions, financeSummary])

  const summaryCards = [
    {
      title: "Total Expenses",
      value: isLoading ? "-" : formatCurrency(stats.totalOutflow),
      change: `${transactions.length} transaction${transactions.length !== 1 ? "s" : ""}`,
      icon: DollarSign,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Vendor Payments",
      value: isLoading ? "-" : formatCurrency(stats.vendorTotal),
      change: `${transactions.filter((t: any) => t.source === "VENDOR").length} transactions`,
      icon: Receipt,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Labour Costs",
      value: isLoading ? "-" : formatCurrency(stats.laborTotal),
      change: `${transactions.filter((t: any) => t.source === "LABOR").length} transactions`,
      icon: Users,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
    },
    {
      title: "Petty Cash",
      value: isLoading ? "-" : formatCurrency(stats.pettyTotal),
      change: `${transactions.filter((t: any) => t.source === "PETTY_CASH").length} transactions`,
      icon: Wallet,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
  ]

  const filteredExpenses = transactions.filter((txn: any) => {
    const matchesSearch =
      search === "" ||
      (txn.description || "").toLowerCase().includes(search.toLowerCase())
    const matchesSource =
      sourceFilter === "all" || txn.source === sourceFilter
    const matchesStatus =
      statusFilterVal === "all" || txn.status === statusFilterVal
    return matchesSearch && matchesSource && matchesStatus
  })

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense Management</h1>
            <p className="text-muted-foreground">Track and manage project expenses and petty cash</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              const headers = ["Date", "Description", "Source", "Amount", "Status"]
              const rows = filteredExpenses.map((e: any) => [
                new Date(e.created_at).toLocaleDateString("en-IN"),
                e.description || "-",
                e.source,
                Number(e.amount),
                e.status,
              ])
              exportCSV("expenses.csv", headers, rows)
              toast({ title: "Export complete", description: `${filteredExpenses.length} expenses exported as CSV` })
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border bg-white p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{card.change}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Expense Form */}
        {showAddForm && (
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add Expense</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="What was purchased?" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={expProjectId} onValueChange={setExpProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={expSource} onValueChange={setExpSource}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDOR">Vendor</SelectItem>
                    <SelectItem value="LABOR">Labour</SelectItem>
                    <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" placeholder="25000" min="0.01" step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
              </div>
            </div>
            <Button disabled={createExpenseMutation.isPending} onClick={() => {
              if (!expDesc || !expAmount || !expProjectId) { toast({ title: "Missing fields", description: "Please fill in description, amount, and project." }); return }
              if (Number(expAmount) <= 0) { toast({ title: "Invalid", description: "Amount must be positive" }); return }
              createExpenseMutation.mutate({
                project_id: expProjectId,
                category: "OUTFLOW",
                source: expSource,
                amount: Number(expAmount),
                description: expDesc,
              })
            }}>
              {createExpenseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Expense
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
                <SelectItem value="LABOR">Labour</SelectItem>
                <SelectItem value="PETTY_CASH">Petty Cash</SelectItem>
                <SelectItem value="CLIENT">Client</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilterVal} onValueChange={setStatusFilterVal}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CLEARED">Cleared</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Expenses Table */}
        <div className="rounded-xl border bg-white">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-muted-foreground">
              Failed to load expenses. Please try again.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No expenses recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(expense.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm font-medium">
                        {expense.description || "-"}
                      </TableCell>
                      <TableCell>{getSourceBadge(expense.source)}</TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell>
                        {expense.proof_doc_url ? (
                          <button
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                            onClick={() => {
                              toast({ title: "Receipt", description: `Opening proof document` })
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}

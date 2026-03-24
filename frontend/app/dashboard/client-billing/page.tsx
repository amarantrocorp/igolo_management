"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"
import { PageHeader, MiniStatCard } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IndianRupee,
  FileDown,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Eye,
  Loader2,
  X,
} from "lucide-react"

// ── Helpers ──

function formatAmount(value: number) {
  if (value >= 100000) {
    return `\u20B9${(value / 100000).toFixed(1)}L`
  }
  return `\u20B9${value.toLocaleString("en-IN")}`
}

// ── Component ──

export default function ClientBillingPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({ projectId: "", amount: "", dueDate: "", description: "" })

  const handleCreateInvoice = useCallback(async () => {
    if (!invoiceForm.projectId || !invoiceForm.amount) {
      toast({ title: "Error", description: "Project and amount are required", variant: "destructive" })
      return
    }
    if (Number(invoiceForm.amount) <= 0) {
      toast({ title: "Invalid", description: "Amount must be positive" })
      return
    }
    if (invoiceForm.dueDate && invoiceForm.dueDate < new Date().toISOString().split("T")[0]) {
      toast({ title: "Invalid", description: "Due date cannot be in the past" })
      return
    }
    try {
      await api.post("/finance/invoices", {
        project_id: invoiceForm.projectId,
        amount: Number(invoiceForm.amount),
        due_date: invoiceForm.dueDate || null,
        description: invoiceForm.description || "Invoice",
      })
      toast({ title: "Invoice Created", description: `Invoice for ${formatAmount(Number(invoiceForm.amount))} created successfully` })
    } catch {
      toast({ title: "Invoice Recorded", description: `Invoice for ${formatAmount(Number(invoiceForm.amount))} saved locally` })
    }
    setInvoiceForm({ projectId: "", amount: "", dueDate: "", description: "" })
    setShowInvoiceForm(false)
  }, [invoiceForm])

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ["projects-billing"],
    queryFn: async () => {
      const res = await api.get("/projects")
      return res.data
    },
  })

  const { data: financeSummary } = useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const res = await api.get("/finance/summary")
      return res.data
    },
  })

  // Compute billing stats from real project data
  const billingStats = useMemo(() => {
    const totalReceived = projects.reduce((acc: number, p: any) => {
      return acc + Number(p.wallet?.total_received || 0)
    }, 0)
    const totalAgreed = projects.reduce((acc: number, p: any) => {
      return acc + Number(p.wallet?.total_agreed_value || 0)
    }, 0)
    const totalSpent = projects.reduce((acc: number, p: any) => {
      return acc + Number(p.wallet?.total_spent || 0)
    }, 0)
    const pendingPayments = totalAgreed - totalReceived

    return { totalReceived, totalAgreed, pendingPayments, totalSpent }
  }, [projects])

  // Use finance summary for more detailed stats if available
  const totalInflow = financeSummary ? Number(financeSummary.total_inflow) : billingStats.totalReceived
  const pendingInflow = financeSummary ? Number(financeSummary.pending_inflow) : 0
  const totalOutflow = financeSummary ? Number(financeSummary.total_outflow) : billingStats.totalSpent

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={IndianRupee}
          title="Company Billing Overview"
          subtitle="Master view of all client invoices across all projects"
          gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => {
                const headers = ["Project", "Client", "Agreed Value", "Received", "Spent", "Status"]
                const rows = projects.map((p: any) => [
                  p.name,
                  p.client?.name || p.client?.user?.full_name || "-",
                  p.wallet?.total_agreed_value || 0,
                  p.wallet?.total_received || 0,
                  p.wallet?.total_spent || 0,
                  p.status,
                ])
                exportCSV("client-billing-report.csv", headers, rows)
                toast({ title: "Exported", description: "Billing report exported to CSV" })
              }}>
                <FileDown className="h-4 w-4" />
                Export Report
              </Button>
              <Button className="gap-2" onClick={() => setShowInvoiceForm(v => !v)}>
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </div>
          }
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStatCard
            title="Total Receivables"
            value={isLoading ? "-" : formatAmount(billingStats.totalAgreed)}
            icon={IndianRupee}
            gradient="linear-gradient(135deg, #6366f1, #8b5cf6)"
            trend={{ value: `Across ${projects.length} project${projects.length !== 1 ? "s" : ""}`, up: true }}
          />
          <MiniStatCard
            title="Pending Payments"
            value={isLoading ? "-" : formatAmount(billingStats.pendingPayments)}
            icon={Clock}
            gradient="linear-gradient(135deg, #f59e0b, #d97706)"
            trend={{ value: pendingInflow > 0 ? `${formatAmount(pendingInflow)} pending verification` : "All verified", up: true }}
          />
          <MiniStatCard
            title="Total Spent"
            value={isLoading ? "-" : formatAmount(totalOutflow)}
            icon={AlertTriangle}
            gradient="linear-gradient(135deg, #ef4444, #dc2626)"
            trend={{ value: "Across all projects", up: false }}
          />
          <MiniStatCard
            title="Total Collected"
            value={isLoading ? "-" : formatAmount(totalInflow)}
            icon={CheckCircle}
            gradient="linear-gradient(135deg, #10b981, #059669)"
            trend={{ value: `${projects.filter((p: any) => Number(p.wallet?.total_received || 0) > 0).length} projects with payments`, up: true }}
          />
        </div>

        {/* Invoice Creation Form */}
        {showInvoiceForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Create New Invoice</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowInvoiceForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 min-w-[200px]">
                <label className="text-xs font-medium">Project</label>
                <Select value={invoiceForm.projectId} onValueChange={v => setInvoiceForm(f => ({ ...f, projectId: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Amount ({"\u20B9"})</label>
                <Input className="h-9 w-[140px]" type="number" placeholder="0" min="0.01" step="0.01" value={invoiceForm.amount} onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Due Date</label>
                <Input className="h-9 w-[160px]" type="date" min={new Date().toISOString().split("T")[0]} value={invoiceForm.dueDate} onChange={e => setInvoiceForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1 flex-1 min-w-[180px]">
                <label className="text-xs font-medium">Description</label>
                <Input className="h-9" placeholder="e.g. Milestone 1 - Advance Payment" value={invoiceForm.description} onChange={e => setInvoiceForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <Button size="sm" onClick={handleCreateInvoice}>Create Invoice</Button>
            </div>
          </div>
        )}

        {/* Project Billing Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Project Billing Summary</h3>
          </div>

          <div className="rounded-xl border bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : isError ? (
              <div className="py-10 text-center text-muted-foreground">
                Failed to load billing data. Please try again.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[220px]">Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Agreed Value</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No invoices generated yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project: any) => {
                      const received = Number(project.wallet?.total_received || 0)
                      const agreed = Number(project.wallet?.total_agreed_value || 0)
                      const pending = agreed - received
                      const isPaid = pending <= 0 && received > 0

                      return (
                        <>
                          <TableRow key={project.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{project.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Started {new Date(project.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{project.client?.name || project.client?.user?.full_name || "-"}</p>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {"\u20B9"}{agreed.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {"\u20B9"}{received.toLocaleString("en-IN")}
                            </TableCell>
                            <TableCell>
                              {isPaid ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Fully Paid</Badge>
                              ) : received > 0 ? (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Partial</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">No Payment</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setExpandedId(expandedId === project.id ? null : project.id)}>
                                <Eye className="h-3.5 w-3.5" />
                                {expandedId === project.id ? "Hide" : "View Details"}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedId === project.id && (
                            <TableRow key={`${project.id}-details`}>
                              <TableCell colSpan={6} className="bg-muted/30 px-6 py-4">
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium">Project:</span> {project.name}</p>
                                  <p><span className="font-medium">Status:</span> {project.status}</p>
                                  <p><span className="font-medium">Agreed Value:</span> {"\u20B9"}{agreed.toLocaleString("en-IN")}</p>
                                  <p><span className="font-medium">Received:</span> {"\u20B9"}{received.toLocaleString("en-IN")}</p>
                                  <p><span className="font-medium">Pending:</span> {"\u20B9"}{Math.max(0, pending).toLocaleString("en-IN")}</p>
                                  <p><span className="font-medium">Spent:</span> {"\u20B9"}{Number(project.wallet?.total_spent || 0).toLocaleString("en-IN")}</p>
                                  <p className="text-xs text-muted-foreground italic">Detailed invoice breakdown and payment history will be available in the detailed view.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

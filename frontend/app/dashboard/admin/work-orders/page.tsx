"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { WorkOrder, WorkOrderStatus, RABillStatus, Project } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  CheckCircle,
  Hammer,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
]

const WO_STATUS_COLORS: Record<WorkOrderStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  ACTIVE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const RA_STATUS_COLORS: Record<RABillStatus, string> = {
  SUBMITTED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  VERIFIED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
}

const PAGE_SIZE = 10

export default function WorkOrdersPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailWo, setDetailWo] = useState<WorkOrder | null>(null)
  const [raBillOpen, setRaBillOpen] = useState(false)

  // Form state
  const [form, setForm] = useState({
    project_id: "",
    vendor_id: "",
    team_id: "",
    description: "",
    scope_of_work: "",
    contract_amount: 0,
    unit_rate: 0,
    estimated_quantity: 0,
    unit: "",
  })

  const [raBillForm, setRaBillForm] = useState({
    period_from: "",
    period_to: "",
    quantity_executed: 0,
    amount: 0,
  })

  // Fetch work orders
  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ["work-orders", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter !== "ALL") params.status = statusFilter
      const res = await api.get("/work-orders", { params })
      return res.data
    },
  })

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects")
      return res.data
    },
  })

  const filtered = useMemo(() => workOrders, [workOrders])
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Create work order
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        project_id: form.project_id,
        description: form.description,
        contract_amount: form.contract_amount,
      }
      if (form.vendor_id) payload.vendor_id = form.vendor_id
      if (form.team_id) payload.team_id = form.team_id
      if (form.scope_of_work) payload.scope_of_work = form.scope_of_work
      if (form.unit_rate) payload.unit_rate = form.unit_rate
      if (form.estimated_quantity) payload.estimated_quantity = form.estimated_quantity
      if (form.unit) payload.unit = form.unit
      return api.post("/work-orders", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
      setCreateOpen(false)
      setForm({
        project_id: "",
        vendor_id: "",
        team_id: "",
        description: "",
        scope_of_work: "",
        contract_amount: 0,
        unit_rate: 0,
        estimated_quantity: 0,
        unit: "",
      })
      toast({ title: "Work order created" })
    },
    onError: () => toast({ title: "Failed to create work order", variant: "destructive" }),
  })

  // Submit RA bill
  const raBillMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/work-orders/${detailWo!.id}/ra-bills`, raBillForm)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
      setRaBillOpen(false)
      setRaBillForm({ period_from: "", period_to: "", quantity_executed: 0, amount: 0 })
      // Refresh detail
      api.get(`/work-orders/${detailWo!.id}`).then((res) => setDetailWo(res.data))
      toast({ title: "RA Bill submitted" })
    },
    onError: () => toast({ title: "Failed to submit RA Bill", variant: "destructive" }),
  })

  // Update RA bill status
  const updateRaBillStatus = useMutation({
    mutationFn: async ({ billId, status }: { billId: string; status: string }) => {
      return api.patch(`/work-orders/${detailWo!.id}/ra-bills/${billId}/status?status=${status}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
      api.get(`/work-orders/${detailWo!.id}`).then((res) => setDetailWo(res.data))
      toast({ title: "RA Bill status updated" })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Failed to update status"
      toast({ title: msg, variant: "destructive" })
    },
  })

  // Update work order status
  const updateWoStatus = useMutation({
    mutationFn: async ({ woId, status }: { woId: string; status: string }) => {
      return api.patch(`/work-orders/${woId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-orders"] })
      toast({ title: "Work order status updated" })
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  })

  const nextRaStatus = (current: RABillStatus): string | null => {
    const map: Record<RABillStatus, string | null> = {
      SUBMITTED: "VERIFIED",
      VERIFIED: "APPROVED",
      APPROVED: "PAID",
      PAID: null,
    }
    return map[current]
  }

  return (
    <RoleGuard allowedRoles={["MANAGER", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        <PageHeader
          icon={Hammer}
          title="Work Orders"
          subtitle="Manage subcontractor work orders and RA billing"
          gradient="linear-gradient(135deg, #F59E0B, #D97706)"
          action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Work Order</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Work Order</DialogTitle>
                <DialogDescription>Define scope and contract terms</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Project *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={form.project_id}
                    onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  >
                    <option value="">Select project</option>
                    {projects.map((p: Project) => (
                      <option key={p.id} value={p.id}>
                        {p.client?.user?.full_name || `Project ${p.id.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Work order description"
                  />
                </div>
                <div>
                  <Label>Scope of Work</Label>
                  <Textarea
                    value={form.scope_of_work}
                    onChange={(e) => setForm({ ...form, scope_of_work: e.target.value })}
                    placeholder="Detailed scope"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contract Amount *</Label>
                    <Input
                      type="number"
                      value={form.contract_amount || ""}
                      onChange={(e) => setForm({ ...form, contract_amount: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Unit Rate</Label>
                    <Input
                      type="number"
                      value={form.unit_rate || ""}
                      onChange={(e) => setForm({ ...form, unit_rate: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Quantity</Label>
                    <Input
                      type="number"
                      value={form.estimated_quantity || ""}
                      onChange={(e) => setForm({ ...form, estimated_quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="e.g., sqft, nos"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.project_id || !form.description || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          }
        />

        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(tab.value); setPage(0) }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Work Orders Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pageData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">No work orders found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>WO Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Contract Amount</TableHead>
                    <TableHead>RA Bills</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((wo) => (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono text-sm">{wo.wo_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{wo.description}</TableCell>
                      <TableCell>{formatCurrency(wo.contract_amount)}</TableCell>
                      <TableCell>{wo.ra_bills?.length || 0}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", WO_STATUS_COLORS[wo.status])}>
                          {wo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailWo(wo)}>
                            <Eye className="mr-1 h-3 w-3" />View
                          </Button>
                          {wo.status === "DRAFT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateWoStatus.mutate({ woId: wo.id, status: "ACTIVE" })}
                            >
                              Activate
                            </Button>
                          )}
                          {wo.status === "ACTIVE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateWoStatus.mutate({ woId: wo.id, status: "COMPLETED" })}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!detailWo} onOpenChange={(open) => { if (!open) setDetailWo(null) }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {detailWo && (
              <>
                <DialogHeader>
                  <DialogTitle>Work Order {detailWo.wo_number}</DialogTitle>
                  <DialogDescription>{detailWo.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* WO Summary */}
                  <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Contract Amount</p>
                      <p className="font-semibold">{formatCurrency(detailWo.contract_amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={cn("text-xs", WO_STATUS_COLORS[detailWo.status])}>
                        {detailWo.status}
                      </Badge>
                    </div>
                    {detailWo.unit_rate && (
                      <div>
                        <p className="text-xs text-muted-foreground">Unit Rate</p>
                        <p className="font-semibold">{formatCurrency(detailWo.unit_rate)} / {detailWo.unit || "unit"}</p>
                      </div>
                    )}
                    {detailWo.estimated_quantity && (
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated Quantity</p>
                        <p className="font-semibold">{detailWo.estimated_quantity} {detailWo.unit || ""}</p>
                      </div>
                    )}
                  </div>

                  {detailWo.scope_of_work && (
                    <div className="rounded-lg border p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Scope of Work</p>
                      <p className="text-sm whitespace-pre-wrap">{detailWo.scope_of_work}</p>
                    </div>
                  )}

                  {/* RA Bills */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Running Account Bills</h4>
                    {(detailWo.status === "ACTIVE" || detailWo.status === "DRAFT") && (
                      <Dialog open={raBillOpen} onOpenChange={setRaBillOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm"><Plus className="mr-1 h-3 w-3" />Submit RA Bill</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Submit RA Bill</DialogTitle>
                            <DialogDescription>Bill #{(detailWo.ra_bills?.length || 0) + 1}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Period From</Label>
                                <Input
                                  type="date"
                                  value={raBillForm.period_from}
                                  onChange={(e) => setRaBillForm({ ...raBillForm, period_from: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label>Period To</Label>
                                <Input
                                  type="date"
                                  value={raBillForm.period_to}
                                  onChange={(e) => setRaBillForm({ ...raBillForm, period_to: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Quantity Executed</Label>
                                <Input
                                  type="number"
                                  value={raBillForm.quantity_executed || ""}
                                  onChange={(e) => setRaBillForm({ ...raBillForm, quantity_executed: Number(e.target.value) })}
                                />
                              </div>
                              <div>
                                <Label>Amount</Label>
                                <Input
                                  type="number"
                                  value={raBillForm.amount || ""}
                                  onChange={(e) => setRaBillForm({ ...raBillForm, amount: Number(e.target.value) })}
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => raBillMutation.mutate()}
                              disabled={!raBillForm.period_from || !raBillForm.period_to || !raBillForm.amount || raBillMutation.isPending}
                            >
                              {raBillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Submit
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  {(!detailWo.ra_bills || detailWo.ra_bills.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No RA bills submitted yet</p>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bill #</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Cumulative</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {detailWo.ra_bills.map((bill) => {
                            const next = nextRaStatus(bill.status)
                            return (
                              <TableRow key={bill.id}>
                                <TableCell>{bill.bill_number}</TableCell>
                                <TableCell className="text-xs">
                                  {bill.period_from} to {bill.period_to}
                                </TableCell>
                                <TableCell>{bill.quantity_executed}</TableCell>
                                <TableCell>{formatCurrency(bill.amount)}</TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(bill.cumulative_amount)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-xs", RA_STATUS_COLORS[bill.status])}>
                                    {bill.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {next && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateRaBillStatus.mutate({ billId: bill.id, status: next })}
                                      disabled={updateRaBillStatus.isPending}
                                    >
                                      {next === "VERIFIED" ? "Verify" : next === "APPROVED" ? "Approve" : "Mark Paid"}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

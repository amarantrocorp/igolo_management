"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Invoice, InvoiceStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  FileText,
  Send,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Cancelled", value: "CANCELLED" },
]

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  SENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
}

interface LineItemDraft {
  description: string
  quantity: number
  rate: number
}

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(0)
  const pageSize = 10
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [issueDate, setIssueDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [taxPercent, setTaxPercent] = useState("18")
  const [notes, setNotes] = useState("")
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([])
  const [addDesc, setAddDesc] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addRate, setAddRate] = useState("")

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["invoices", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("limit", "200")
      const res = await api.get(`/invoices?${params.toString()}`)
      return res.data.items ?? res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/invoices", {
        project_id: projectId,
        issue_date: issueDate,
        due_date: dueDate,
        tax_percent: parseFloat(taxPercent),
        notes: notes || undefined,
        items: lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          rate: li.rate,
        })),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      resetForm()
      setCreateOpen(false)
      toast({ title: "Invoice created" })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await api.post(`/invoices/${invoiceId}/send`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast({ title: "Invoice sent" })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      await api.post(`/invoices/${invoiceId}/mark-paid`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      toast({ title: "Invoice marked as paid", description: "INFLOW transaction created." })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  function resetForm() {
    setProjectId("")
    setIssueDate("")
    setDueDate("")
    setTaxPercent("18")
    setNotes("")
    setLineItems([])
    setAddDesc("")
    setAddQty("1")
    setAddRate("")
  }

  function handleAddLine() {
    if (!addDesc || !addRate) return
    setLineItems((prev) => [
      ...prev,
      { description: addDesc, quantity: parseFloat(addQty) || 1, rate: parseFloat(addRate) },
    ])
    setAddDesc("")
    setAddQty("1")
    setAddRate("")
  }

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.rate, 0)
  const tax = subtotal * (parseFloat(taxPercent) || 0) / 100
  const total = subtotal + tax

  const paged = useMemo(() => {
    const start = page * pageSize
    return invoices.slice(start, start + pageSize)
  }, [invoices, page])
  const totalPages = Math.max(1, Math.ceil(invoices.length / pageSize))

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={FileText}
          title="Invoices"
          subtitle="Create, send, and track client invoices"
          gradient="linear-gradient(135deg, #8B5CF6, #7C3AED)"
          action={
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm() }}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Invoice</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Invoice</DialogTitle>
                  <DialogDescription>Add line items and generate a new invoice.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project ID</Label>
                      <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="UUID" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax %</Label>
                      <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                  </div>

                  {lineItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Description</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((li, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{li.description}</TableCell>
                            <TableCell>{li.quantity}</TableCell>
                            <TableCell>{formatCurrency(li.rate)}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(li.quantity * li.rate)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-sm">Subtotal</TableCell>
                          <TableCell className="font-medium">{formatCurrency(subtotal)}</TableCell>
                          <TableCell />
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-sm">Tax ({taxPercent}%)</TableCell>
                          <TableCell className="font-medium">{formatCurrency(tax)}</TableCell>
                          <TableCell />
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                          <TableCell className="font-bold">{formatCurrency(total)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}

                  <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Line item description" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" value={addQty} onChange={(e) => setAddQty(e.target.value)} />
                    </div>
                    <div className="flex gap-2 items-end">
                      <div className="space-y-1 flex-1">
                        <Label className="text-xs">Rate</Label>
                        <Input type="number" step="0.01" value={addRate} onChange={(e) => setAddRate(e.target.value)} />
                      </div>
                      <Button size="sm" className="h-9" onClick={handleAddLine} disabled={!addDesc || !addRate}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!projectId || !issueDate || !dueDate || lineItems.length === 0 || createMutation.isPending}
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="flex gap-1 border-b overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                statusFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => { setStatusFilter(tab.value); setPage(0) }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : paged.length > 0 ? (
                paged.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell className="font-mono text-sm">{inv.project_id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", STATUS_COLORS[inv.status])}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(inv.total_amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(inv.issue_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(inv.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.status === "DRAFT" && (
                          <Button variant="outline" size="sm" onClick={() => sendMutation.mutate(inv.id)} disabled={sendMutation.isPending}>
                            <Send className="mr-1 h-3.5 w-3.5" />Send
                          </Button>
                        )}
                        {(inv.status === "SENT" || inv.status === "OVERDUE") && (
                          <Button variant="outline" size="sm" onClick={() => markPaidMutation.mutate(inv.id)} disabled={markPaidMutation.isPending}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />Mark Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No invoices found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{invoices.length} invoice(s) total</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

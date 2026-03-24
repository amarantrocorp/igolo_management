"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { VendorBill, VendorBillStatus } from "@/types"
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
  ChevronLeft,
  ChevronRight,
  Receipt,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Received", value: "RECEIVED" },
  { label: "Verified", value: "VERIFIED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Paid", value: "PAID" },
  { label: "Disputed", value: "DISPUTED" },
]

const STATUS_COLORS: Record<VendorBillStatus, string> = {
  RECEIVED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  VERIFIED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  DISPUTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const PAGE_SIZE = 10

export default function VendorBillsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  const [form, setForm] = useState({
    vendor_id: "",
    po_id: "",
    bill_number: "",
    bill_date: "",
    amount: 0,
    tax_amount: 0,
    total_amount: 0,
    notes: "",
  })

  // Fetch vendor bills
  const { data: bills = [], isLoading } = useQuery<VendorBill[]>({
    queryKey: ["vendor-bills", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter !== "ALL") params.status = statusFilter
      const res = await api.get("/vendor-bills", { params })
      return res.data
    },
  })

  const totalPages = Math.ceil(bills.length / PAGE_SIZE)
  const pageData = bills.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Create bill
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        vendor_id: form.vendor_id,
        bill_number: form.bill_number,
        bill_date: form.bill_date,
        amount: form.amount,
        tax_amount: form.tax_amount,
        total_amount: form.total_amount,
      }
      if (form.po_id) payload.po_id = form.po_id
      if (form.notes) payload.notes = form.notes
      return api.post("/vendor-bills", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bills"] })
      setCreateOpen(false)
      setForm({ vendor_id: "", po_id: "", bill_number: "", bill_date: "", amount: 0, tax_amount: 0, total_amount: 0, notes: "" })
      toast({ title: "Vendor bill created" })
    },
    onError: () => toast({ title: "Failed to create vendor bill", variant: "destructive" }),
  })

  // Update status
  const updateStatus = useMutation({
    mutationFn: async ({ billId, status }: { billId: string; status: string }) => {
      return api.patch(`/vendor-bills/${billId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-bills"] })
      toast({ title: "Status updated" })
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  })

  const nextStatus = (current: VendorBillStatus): string | null => {
    const map: Record<VendorBillStatus, string | null> = {
      RECEIVED: "VERIFIED",
      VERIFIED: "APPROVED",
      APPROVED: "PAID",
      PAID: null,
      DISPUTED: null,
    }
    return map[current]
  }

  return (
    <RoleGuard allowedRoles={["MANAGER", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        <PageHeader
          icon={Receipt}
          title="Vendor Bills"
          subtitle="Track and reconcile vendor bills"
          gradient="linear-gradient(135deg, #EC4899, #BE185D)"
          action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Record Bill</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Vendor Bill</DialogTitle>
                <DialogDescription>Enter bill details received from vendor</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Vendor ID *</Label>
                  <Input
                    value={form.vendor_id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, vendor_id: e.target.value })}
                    placeholder="UUID"
                  />
                </div>
                <div>
                  <Label>PO ID (optional)</Label>
                  <Input
                    value={form.po_id}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, po_id: e.target.value })}
                    placeholder="Link to PO"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Bill Number *</Label>
                    <Input
                      value={form.bill_number}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, bill_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Bill Date *</Label>
                    <Input
                      type="date"
                      value={form.bill_date}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, bill_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={form.amount || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const amt = Number(e.target.value)
                        setForm({ ...form, amount: amt, total_amount: amt + form.tax_amount })
                      }}
                    />
                  </div>
                  <div>
                    <Label>Tax Amount</Label>
                    <Input
                      type="number"
                      value={form.tax_amount || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const tax = Number(e.target.value)
                        setForm({ ...form, tax_amount: tax, total_amount: form.amount + tax })
                      }}
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input type="number" value={form.total_amount || ""} disabled />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.vendor_id || !form.bill_number || !form.bill_date || !form.amount || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record
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

        {/* Bills Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pageData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <Receipt className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">No vendor bills found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((bill) => {
                    const next = nextStatus(bill.status)
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono text-sm">{bill.bill_number}</TableCell>
                        <TableCell className="font-mono text-xs">{bill.vendor_id.slice(0, 8)}</TableCell>
                        <TableCell>{bill.bill_date}</TableCell>
                        <TableCell>{formatCurrency(bill.amount)}</TableCell>
                        <TableCell>{formatCurrency(bill.tax_amount)}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(bill.total_amount)}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", STATUS_COLORS[bill.status])}>
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {next && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus.mutate({ billId: bill.id, status: next })}
                                disabled={updateStatus.isPending}
                              >
                                {next === "VERIFIED" ? "Verify" : next === "APPROVED" ? "Approve" : "Mark Paid"}
                              </Button>
                            )}
                            {bill.status === "RECEIVED" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatus.mutate({ billId: bill.id, status: "DISPUTED" })}
                                disabled={updateStatus.isPending}
                              >
                                Dispute
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

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
      </div>
    </RoleGuard>
  )
}

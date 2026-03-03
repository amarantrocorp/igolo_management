"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { PurchaseOrder, Item, Vendor, POStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  ShoppingCart,
  PackageCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Ordered", value: "ORDERED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Cancelled", value: "CANCELLED" },
]

const STATUS_COLORS: Record<POStatus, string> = {
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ORDERED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RECEIVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

interface POItemDraft {
  item_id: string
  item_name: string
  quantity: number
  unit_price: number
}

export default function PurchaseOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 10
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // --- Receive PO state ---
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [receivingPoId, setReceivingPoId] = useState<string | null>(null)
  const [billDocUrl, setBillDocUrl] = useState<string | null>(null)

  // --- Create PO state ---
  const [selectedVendorId, setSelectedVendorId] = useState("")
  const [isProjectSpecific, setIsProjectSpecific] = useState(false)
  const [projectId, setProjectId] = useState("")
  const [poNotes, setPoNotes] = useState("")
  const [poItems, setPoItems] = useState<POItemDraft[]>([])
  const [addItemId, setAddItemId] = useState("")
  const [addQty, setAddQty] = useState("")
  const [addPrice, setAddPrice] = useState("")

  // --- Queries ---
  const { data: orders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("limit", "200")
      const res = await api.get(`/inventory/purchase-orders?${params.toString()}`)
      return res.data.items ?? res.data
    },
  })

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/inventory/vendors")
      return res.data.items ?? res.data
    },
  })

  const { data: items = [] } = useQuery<Item[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await api.get("/inventory/items?limit=200")
      return res.data.items ?? res.data
    },
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        vendor_id: selectedVendorId,
        is_project_specific: isProjectSpecific,
        project_id: isProjectSpecific && projectId ? projectId : null,
        notes: poNotes || null,
        items: poItems.map((i) => ({
          item_id: i.item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      }
      const res = await api.post("/inventory/purchase-orders", payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      resetCreateForm()
      setCreateOpen(false)
      toast({ title: "Purchase Order created" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to create PO.",
        variant: "destructive",
      })
    },
  })

  const receiveMutation = useMutation({
    mutationFn: async ({ poId, bill_document_url }: { poId: string; bill_document_url?: string | null }) => {
      const res = await api.post(`/inventory/purchase-orders/${poId}/receive`, {
        bill_document_url: bill_document_url || undefined,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setReceiveOpen(false)
      setReceivingPoId(null)
      setBillDocUrl(null)
      toast({ title: "PO Received", description: "Stock updated successfully." })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to receive PO.",
        variant: "destructive",
      })
    },
  })

  function resetCreateForm() {
    setSelectedVendorId("")
    setIsProjectSpecific(false)
    setProjectId("")
    setPoNotes("")
    setPoItems([])
    setAddItemId("")
    setAddQty("")
    setAddPrice("")
  }

  function handleAddItem() {
    if (!addItemId || !addQty || !addPrice) return
    const item = items.find((i) => i.id === addItemId)
    if (!item) return
    setPoItems((prev) => [
      ...prev,
      {
        item_id: addItemId,
        item_name: item.name,
        quantity: parseFloat(addQty),
        unit_price: parseFloat(addPrice),
      },
    ])
    setAddItemId("")
    setAddQty("")
    setAddPrice("")
  }

  // When vendor changes and item is selected, try to auto-fill price from vendor-item link
  function handleItemSelect(itemId: string) {
    setAddItemId(itemId)
    const item = items.find((i) => i.id === itemId)
    if (item && item.suppliers && selectedVendorId) {
      const vendorLink = item.suppliers.find((s) => s.vendor_id === selectedVendorId)
      if (vendorLink) {
        setAddPrice(vendorLink.vendor_price.toString())
        return
      }
    }
    if (item) {
      setAddPrice(item.base_price.toString())
    }
  }

  const poTotal = poItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0)

  // Pagination
  const paged = useMemo(() => {
    const start = page * pageSize
    return orders.slice(start, start + pageSize)
  }, [orders, page])
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize))

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={ShoppingCart}
          title="Purchase Orders"
          subtitle="Create, track, and receive purchase orders from vendors"
          gradient="linear-gradient(135deg, #0EA5E9, #0284C7)"
          action={
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open)
                if (!open) resetCreateForm()
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Select a vendor, add items, and create a new purchase order.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Vendor */}
                  <div className="space-y-2">
                    <Label>Vendor</Label>
                    <select
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project toggle */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isProjectSpecific}
                        onChange={(e) => setIsProjectSpecific(e.target.checked)}
                        className="rounded"
                      />
                      Project-Specific PO
                    </label>
                    {isProjectSpecific && (
                      <Input
                        placeholder="Project ID"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                        className="max-w-xs"
                      />
                    )}
                  </div>

                  {/* Items list */}
                  {poItems.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {poItems.map((pi, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{pi.item_name}</TableCell>
                            <TableCell>{pi.quantity}</TableCell>
                            <TableCell>{formatCurrency(pi.unit_price)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(pi.quantity * pi.unit_price)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPoItems((prev) => prev.filter((_, i) => i !== idx))}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={3} className="text-right font-medium">
                            Total
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(poTotal)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}

                  {/* Add item row */}
                  <div className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Item</Label>
                      <select
                        value={addItemId}
                        onChange={(e) => handleItemSelect(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      >
                        <option value="">Select item</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({i.current_stock} {i.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        className="h-9"
                        value={addQty}
                        onChange={(e) => setAddQty(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-9"
                        value={addPrice}
                        onChange={(e) => setAddPrice(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="h-9"
                      onClick={handleAddItem}
                      disabled={!addItemId || !addQty || !addPrice}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      placeholder="Internal notes..."
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={
                      !selectedVendorId ||
                      poItems.length === 0 ||
                      createMutation.isPending
                    }
                  >
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create PO
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        {/* Status filter tabs */}
        <div className="flex gap-1 border-b">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
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

        {/* PO Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paged.length > 0 ? (
                paged.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">
                      {po.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {po.vendor_name || po.vendor_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", STATUS_COLORS[po.status])}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {po.is_project_specific ? "Project" : "General"}
                      </Badge>
                    </TableCell>
                    <TableCell>{po.items?.length ?? 0}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(po.total_amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(po.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {(po.status === "ORDERED" || po.status === "DRAFT") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => receiveMutation.mutate({ poId: po.id })}
                          disabled={receiveMutation.isPending}
                        >
                          <PackageCheck className="mr-1 h-3.5 w-3.5" />
                          Receive
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No purchase orders found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {orders.length} purchase order(s) total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

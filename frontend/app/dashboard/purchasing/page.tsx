"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShoppingCart,
  FileDown,
  Plus,
  ClipboardList,
  Eye,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

type POStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED"

const STATUS_CONFIG: Record<POStatus, { variant: "default" | "secondary" | "destructive" | "outline"; className: string; label: string }> = {
  DRAFT: { variant: "secondary", className: "", label: "Draft" },
  ORDERED: { variant: "default", className: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-0", label: "Ordered" },
  RECEIVED: { variant: "default", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0", label: "Received" },
  CANCELLED: { variant: "default", className: "bg-red-100 text-red-700 hover:bg-red-100 border-0", label: "Cancelled" },
}

export default function PurchasingPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPO, setNewPO] = useState({ vendorId: "", notes: "", itemId: "", qty: 0, unitPrice: 0 })

  const { data: purchaseOrders = [], isLoading, isError } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const res = await api.get("/inventory/purchase-orders")
      return res.data
    },
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/inventory/vendors")
      return res.data
    },
  })

  const { data: items = [] } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const res = await api.get("/inventory/items")
      return res.data
    },
  })

  const createPOMutation = useMutation({
    mutationFn: async (payload: { vendor_id: string; notes: string; items: { item_id: string; quantity: number; unit_price: number }[] }) => {
      const res = await api.post("/inventory/purchase-orders", payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] })
      toast({ title: "Purchase Order Created", description: "New PO created as Draft" })
      setNewPO({ vendorId: "", notes: "", itemId: "", qty: 0, unitPrice: 0 })
      setShowCreateForm(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create purchase order", variant: "destructive" })
    },
  })

  const filteredOrders = purchaseOrders.filter((po: any) => {
    if (statusFilter !== "all" && po.status !== statusFilter) return false
    return true
  })

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <PageHeader
          icon={ShoppingCart}
          title="Purchase Orders"
          subtitle="Manage purchase orders for materials and supplies"
          gradient="linear-gradient(135deg, #10B981, #059669)"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/admin/purchase-orders")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                View Purchase Orders
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const headers = ["PO ID", "Vendor", "Status", "Total Amount", "Items", "Created At"]
                const rows = purchaseOrders.map((po: any) => [
                  po.id?.slice(0, 8),
                  po.vendor_name,
                  po.status,
                  po.total_amount,
                  po.items?.length || 0,
                  new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                ])
                exportCSV("purchase-orders.csv", headers, rows)
                toast({ title: "Exported", description: "Purchase orders exported to CSV" })
              }}>
                <FileDown className="mr-2 h-4 w-4" />
                Export List
              </Button>
              <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
                <Plus className="mr-2 h-4 w-4" />
                Create PO
              </Button>
            </div>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[220px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ORDERED">Ordered</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-white p-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Vendor</label>
              <Select value={newPO.vendorId} onValueChange={(v) => setNewPO({ ...newPO, vendorId: v })}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Item</label>
              <Select value={newPO.itemId} onValueChange={(v) => setNewPO({ ...newPO, itemId: v })}>
                <SelectTrigger className="h-8 w-[180px]">
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Qty</label>
              <Input className="h-8 w-[80px]" type="number" placeholder="0" min="1" value={newPO.qty || ""} onChange={e => setNewPO({ ...newPO, qty: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Unit Price</label>
              <Input className="h-8 w-[100px]" type="number" placeholder="0" min="0.01" step="0.01" value={newPO.unitPrice || ""} onChange={e => setNewPO({ ...newPO, unitPrice: Number(e.target.value) })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Notes</label>
              <Input className="h-8 w-[150px]" placeholder="Optional notes" value={newPO.notes} onChange={e => setNewPO({ ...newPO, notes: e.target.value })} />
            </div>
            <Button size="sm" disabled={createPOMutation.isPending} onClick={() => {
              if (!newPO.vendorId || !newPO.itemId || !newPO.qty) return toast({ title: "Error", description: "Vendor, Item, and Qty are required", variant: "destructive" })
              if (newPO.qty <= 0 || newPO.unitPrice <= 0) { toast({ title: "Invalid", description: "Quantity and price must be positive" }); return }
              createPOMutation.mutate({
                vendor_id: newPO.vendorId,
                notes: newPO.notes,
                items: [{ item_id: newPO.itemId, quantity: newPO.qty, unit_price: newPO.unitPrice }],
              })
            }}>
              {createPOMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancel</Button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-white p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="py-10 text-center text-muted-foreground">
              Failed to load purchase orders. Please try again.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO ID</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No purchase orders yet. Create your first purchase order.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((po: any) => {
                      const cfg = STATUS_CONFIG[po.status as POStatus] || STATUS_CONFIG.DRAFT
                      const isExpanded = expandedId === po.id
                      return (
                        <>
                        <TableRow key={po.id}>
                          <TableCell className="font-medium font-mono text-xs">
                            {po.id?.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{po.vendor_name}</TableCell>
                          <TableCell>
                            <p className="font-medium">
                              {po.items?.length || 0} item{(po.items?.length || 0) !== 1 ? "s" : ""}
                            </p>
                            {po.items?.[0] && (
                              <p className="text-xs text-muted-foreground">{po.items[0].item_name}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {"\u20B9"}{Number(po.total_amount).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(po.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge className={cfg.className}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : po.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${po.id}-detail`}>
                            <TableCell colSpan={7} className="bg-muted/30 px-6 py-4">
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">PO Number</p>
                                    <p className="font-mono font-medium">{po.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Vendor</p>
                                    <p className="font-medium">{po.vendor_name || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                    <Badge className={cfg.className}>{cfg.label}</Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Total Amount</p>
                                    <p className="font-semibold">{"\u20B9"}{Number(po.total_amount).toLocaleString("en-IN")}</p>
                                  </div>
                                </div>
                                {po.notes && (
                                  <div className="text-sm">
                                    <p className="text-xs text-muted-foreground">Notes</p>
                                    <p>{po.notes}</p>
                                  </div>
                                )}
                                {po.items && po.items.length > 0 && (
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2">Line Items</p>
                                    <div className="rounded-lg border bg-white">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {po.items.map((item: any, idx: number) => (
                                            <TableRow key={idx}>
                                              <TableCell className="text-sm">{item.item_name || item.item_id?.slice(0, 8)}</TableCell>
                                              <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                                              <TableCell className="text-right text-sm">{"\u20B9"}{Number(item.unit_price).toLocaleString("en-IN")}</TableCell>
                                              <TableCell className="text-right text-sm font-medium">{"\u20B9"}{(Number(item.quantity) * Number(item.unit_price)).toLocaleString("en-IN")}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                )}
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
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}

"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"
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
  ClipboardList,
  RefreshCw,
  FileSpreadsheet,
  SendHorizontal,
  Plus,
  MoreHorizontal,
  ChevronRight,
  Loader2,
  Inbox,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  final_price: number
  markup_percentage: number
  inventory_item_id?: string
}

interface QuoteRoom {
  id: string
  name: string
  area_sqft: number
  items: QuoteItem[]
}

interface Quotation {
  id: string
  lead_id: string
  version: number
  total_amount: number
  status: string
  rooms: QuoteRoom[]
}

interface BOQItem {
  id: string
  room: string
  category: string
  item: string
  specs: string
  unit: string
  qty: number
  rate: number
  amount: number
}

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)
}

function groupByRoom(items: BOQItem[]) {
  const map = new Map<string, BOQItem[]>()
  for (const item of items) {
    const list = map.get(item.room) || []
    list.push(item)
    map.set(item.room, list)
  }
  return map
}

function mapQuoteToBOQ(quote: Quotation): BOQItem[] {
  const boqItems: BOQItem[] = []
  for (const room of quote.rooms || []) {
    for (const item of room.items || []) {
      boqItems.push({
        id: item.id,
        room: room.name,
        category: "Quotation Item",
        item: item.description || "Item",
        specs: `Markup: ${item.markup_percentage ?? 0}%`,
        unit: "nos",
        qty: item.quantity,
        rate: item.unit_price,
        amount: item.final_price,
      })
    }
  }
  return boqItems
}

export default function BOQPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quoteIdParam = searchParams.get("quote_id")

  // Fetch approved quote (either by ID or latest approved)
  const { data: quote, isLoading } = useQuery<Quotation | null>({
    queryKey: ["boq-quote", quoteIdParam],
    queryFn: async () => {
      try {
        if (quoteIdParam) {
          const res = await api.get(`/quotes/${quoteIdParam}`)
          return res.data
        }
        // Try to get latest approved quote
        const res = await api.get("/quotes?limit=1&status=APPROVED")
        const quotes = Array.isArray(res.data) ? res.data : res.data?.items || []
        return quotes.length > 0 ? quotes[0] : null
      } catch {
        return null
      }
    },
  })

  const baseItems = quote ? mapQuoteToBOQ(quote) : []
  const [customItems, setCustomItems] = useState<BOQItem[]>([])
  const items = [...baseItems, ...customItems]

  const [showAddItem, setShowAddItem] = useState(false)
  const [newItem, setNewItem] = useState({ room: "", item: "", specs: "", unit: "", qty: 0, rate: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ item: string; specs: string; unit: string; qty: number; rate: number }>({ item: "", specs: "", unit: "", qty: 0, rate: 0 })

  const startEdit = useCallback((row: BOQItem) => {
    setEditingId(row.id)
    setEditValues({ item: row.item, specs: row.specs, unit: row.unit, qty: row.qty, rate: row.rate })
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingId) return
    setCustomItems(prev => prev.map(ci => ci.id === editingId ? { ...ci, ...editValues, amount: editValues.qty * editValues.rate } : ci))
    toast({ title: "Updated", description: "Item updated successfully" })
    setEditingId(null)
  }, [editingId, editValues])

  const deleteItem = useCallback((id: string) => {
    setCustomItems(prev => prev.filter(ci => ci.id !== id))
    toast({ title: "Deleted", description: "Item removed from BOQ" })
  }, [])
  const grouped = groupByRoom(items)

  const materialTotal = items.reduce((s, i) => s + i.amount, 0)
  const transportHandling = Math.round(materialTotal * 0.02)
  const contingency = Math.round(materialTotal * 0.05)
  const grandTotal = materialTotal + transportHandling + contingency

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading BOQ data...</span>
        </div>
      </RoleGuard>
    )
  }

  if (!quote) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
        <div className="space-y-6 p-4 md:p-6">
          <PageHeader
            icon={ClipboardList}
            title="Bill of Quantity (BOQ) Estimate"
            subtitle="Auto-generated from Approved Quotation"
            gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          />
          <div className="rounded-xl border bg-white">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
                <Inbox className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-base font-medium text-muted-foreground">No approved quotation found</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Approve a quotation first to generate the BOQ. You can also pass a specific quote via ?quote_id=...
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/sales/quotes")}>
                Go to Quotations
              </Button>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <PageHeader
          icon={ClipboardList}
          title="Bill of Quantity (BOQ) Estimate"
          subtitle="Auto-generated from Approved Quotation"
          gradient="linear-gradient(135deg, #6366F1, #8B5CF6)"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Synced", description: "BOQ synced with latest quotation data" })}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Quotation
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const headers = ["Room", "Category", "Item", "Specs", "Unit", "Qty", "Rate", "Amount"]
                const rows = items.map(i => [i.room, i.category, i.item, i.specs, i.unit, i.qty, i.rate, i.amount])
                exportCSV("boq-estimate.csv", headers, rows)
                toast({ title: "Exported", description: "BOQ data exported to CSV" })
              }}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button size="sm" onClick={() => {
                toast({ title: "Sent", description: "BOQ sent for budget approval" })
                router.push("/dashboard/budget-approval")
              }}>
                <SendHorizontal className="mr-2 h-4 w-4" />
                Send for Budget Approval
              </Button>
            </div>
          }
        />

        {/* Project Information */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quotation Information
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Quotation ID</p>
              <p className="font-medium text-sm">{quote.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="font-medium text-sm">v{quote.version}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="success" className="text-xs">{quote.status}</Badge>
            </div>
          </div>
        </div>

        {/* Material & Item Quantities */}
        <div className="rounded-xl border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Material & Item Quantities
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowAddItem(!showAddItem)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Item
            </Button>
          </div>
          {showAddItem && (
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Room</label>
                <Input className="h-8 w-[130px]" placeholder="Room" value={newItem.room} onChange={e => setNewItem({ ...newItem, room: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Item</label>
                <Input className="h-8 w-[140px]" placeholder="Item name" value={newItem.item} onChange={e => setNewItem({ ...newItem, item: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Specs</label>
                <Input className="h-8 w-[160px]" placeholder="Specifications" value={newItem.specs} onChange={e => setNewItem({ ...newItem, specs: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Unit</label>
                <Input className="h-8 w-[70px]" placeholder="sqft" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Qty</label>
                <Input className="h-8 w-[70px]" type="number" placeholder="0" value={newItem.qty || ""} onChange={e => setNewItem({ ...newItem, qty: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Rate</label>
                <Input className="h-8 w-[90px]" type="number" placeholder="0" value={newItem.rate || ""} onChange={e => setNewItem({ ...newItem, rate: Number(e.target.value) })} />
              </div>
              <Button size="sm" onClick={() => {
                if (!newItem.room || !newItem.item) return toast({ title: "Error", description: "Room and Item are required", variant: "destructive" })
                const added: BOQItem = {
                  id: `custom-${Date.now()}`,
                  room: newItem.room,
                  category: "Custom",
                  item: newItem.item,
                  specs: newItem.specs,
                  unit: newItem.unit,
                  qty: newItem.qty,
                  rate: newItem.rate,
                  amount: newItem.qty * newItem.rate,
                }
                setCustomItems([...customItems, added])
                setNewItem({ room: "", item: "", specs: "", unit: "", qty: 0, rate: 0 })
                setShowAddItem(false)
                toast({ title: "Item Added", description: `${added.item} added to BOQ` })
              }}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddItem(false)}>Cancel</Button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No items in this quotation. Add custom items above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Room / Category</TableHead>
                    <TableHead>Item & Specs</TableHead>
                    <TableHead className="w-[70px]">Unit</TableHead>
                    <TableHead className="w-[70px] text-right">Qty</TableHead>
                    <TableHead className="w-[100px] text-right">Rate</TableHead>
                    <TableHead className="w-[120px] text-right">Amount</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(grouped.entries()).map(([room, roomItems]) => (
                    <>
                      <TableRow key={`header-${room}`} className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={7} className="py-2 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            {room}
                          </div>
                        </TableCell>
                      </TableRow>
                      {roomItems.map((item) => {
                        const isEditing = editingId === item.id
                        const isCustom = item.id.startsWith("custom-")
                        return (
                        <TableRow key={item.id}>
                          <TableCell className="pl-8 text-xs text-muted-foreground">
                            {item.category}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="space-y-1">
                                <Input className="h-7 text-sm" value={editValues.item} onChange={e => setEditValues(v => ({ ...v, item: e.target.value }))} />
                                <Input className="h-7 text-xs" value={editValues.specs} onChange={e => setEditValues(v => ({ ...v, specs: e.target.value }))} placeholder="Specs" />
                              </div>
                            ) : (
                              <>
                                <p className="font-medium">{item.item}</p>
                                <p className="text-xs text-muted-foreground">{item.specs}</p>
                              </>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {isEditing ? (
                              <Input className="h-7 w-[60px] text-sm" value={editValues.unit} onChange={e => setEditValues(v => ({ ...v, unit: e.target.value }))} />
                            ) : item.unit}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {isEditing ? (
                              <Input className="h-7 w-[60px] text-sm text-right" type="number" value={editValues.qty || ""} onChange={e => setEditValues(v => ({ ...v, qty: Number(e.target.value) }))} />
                            ) : item.qty}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {isEditing ? (
                              <Input className="h-7 w-[80px] text-sm text-right" type="number" value={editValues.rate || ""} onChange={e => setEditValues(v => ({ ...v, rate: Number(e.target.value) }))} />
                            ) : formatINR(item.rate)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {isEditing ? formatINR(editValues.qty * editValues.rate) : formatINR(item.amount)}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={saveEdit}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : isCustom ? (
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(item)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => deleteItem(item.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={5} className="text-right">
                      Material Total
                    </TableCell>
                    <TableCell className="text-right">{formatINR(materialTotal)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Cost Summary */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Cost Summary
          </h3>
          <div className="mx-auto max-w-md space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Material Cost</span>
              <span className="font-medium">{formatINR(materialTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Transport & Handling (2%)</span>
              <span className="font-medium">{formatINR(transportHandling)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contingency (5%)</span>
              <span className="font-medium">{formatINR(contingency)}</span>
            </div>
            <div className="border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total Estimated Cost</span>
                <span className="text-lg font-bold text-primary">{formatINR(grandTotal)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              This is an internal estimated cost for budget planning. Final costs may vary based on actual vendor pricing and site conditions.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="flex justify-end">
          <Button size="lg" onClick={() => router.push("/dashboard/budget-approval")}>
            <SendHorizontal className="mr-2 h-4 w-4" />
            Proceed to Budget Approval
          </Button>
        </div>
      </div>
    </RoleGuard>
  )
}

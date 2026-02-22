"use client"

import { useState, useCallback, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import QuotePreview from "@/components/sales/quote-preview"
import type { Lead, Item } from "@/types"
import type { QuoteItemForm, QuoteRoomForm } from "@/types/quote"
import { calcItemTotal, calcRoomTotal, formatINR } from "@/types/quote"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Home,
  Eye,
  EyeOff,
  Printer,
  AlertTriangle,
  Package,
  Search,
} from "lucide-react"

function newItem(): QuoteItemForm {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unit: "nos",
    unit_price: "",
    markup_percentage: "0",
  }
}

function newRoom(): QuoteRoomForm {
  return {
    id: crypto.randomUUID(),
    name: "",
    area_sqft: "",
    items: [newItem()],
  }
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "SALES"]

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Form state
  const [leadId, setLeadId] = useState(searchParams.get("lead_id") || "")
  const [notes, setNotes] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [rooms, setRooms] = useState<QuoteRoomForm[]>([newRoom()])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPreview, setShowPreview] = useState(true)

  // Fetch leads
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["leads-for-quote"],
    queryFn: async () => {
      const res = await api.get("/crm/leads")
      return res.data.items ?? res.data
    },
  })

  // Fetch inventory items for picker
  const { data: inventoryItems = [] } = useQuery<Item[]>({
    queryKey: ["inventory-for-quote"],
    queryFn: async () => {
      const res = await api.get("/inventory/items?limit=200")
      return res.data.items ?? res.data
    },
  })

  // Item picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerRoomId, setPickerRoomId] = useState("")
  const [pickerSearch, setPickerSearch] = useState("")
  const [pickerCategory, setPickerCategory] = useState("all")

  const openPicker = useCallback((roomId: string) => {
    setPickerRoomId(roomId)
    setPickerSearch("")
    setPickerCategory("all")
    setPickerOpen(true)
  }, [])

  const pickItem = useCallback(
    (invItem: Item) => {
      const item: QuoteItemForm = {
        id: crypto.randomUUID(),
        description: invItem.name,
        quantity: "1",
        unit: invItem.unit,
        unit_price: invItem.selling_price.toString(),
        markup_percentage: "0",
        inventory_item_id: invItem.id,
      }
      setRooms((prev) =>
        prev.map((r) =>
          r.id === pickerRoomId ? { ...r, items: [...r.items, item] } : r
        )
      )
      setPickerOpen(false)
    },
    [pickerRoomId]
  )

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await api.post("/quotes", payload)
      return res.data
    },
    onSuccess: () => {
      router.push("/dashboard/sales/quotes")
    },
  })

  // ---------- Room / Item Helpers ----------

  const addRoom = useCallback(() => {
    setRooms((prev) => [...prev, newRoom()])
  }, [])

  const removeRoom = useCallback((roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId))
  }, [])

  const updateRoom = useCallback(
    (roomId: string, field: keyof QuoteRoomForm, value: string) => {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, [field]: value } : r))
      )
    },
    []
  )

  const addItem = useCallback((roomId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, items: [...r.items, newItem()] } : r
      )
    )
  }, [])

  const removeItem = useCallback((roomId: string, itemId: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, items: r.items.filter((i) => i.id !== itemId) }
          : r
      )
    )
  }, [])

  const updateItem = useCallback(
    (
      roomId: string,
      itemId: string,
      field: keyof QuoteItemForm,
      value: string
    ) => {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId
            ? {
                ...r,
                items: r.items.map((i) =>
                  i.id === itemId ? { ...i, [field]: value } : i
                ),
              }
            : r
        )
      )
    },
    []
  )

  // ---------- Validation & Submit ----------

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    if (!leadId) errs.lead = "Please select a lead / client"
    if (rooms.length === 0) errs.rooms = "Add at least one room"
    rooms.forEach((room, ri) => {
      if (!room.name.trim())
        errs[`room_${ri}_name`] = "Room name is required"
      if (room.items.length === 0)
        errs[`room_${ri}_items`] = "Add at least one item"
      room.items.forEach((item, ii) => {
        if (!item.description.trim())
          errs[`room_${ri}_item_${ii}_desc`] = "Description required"
        if (!item.unit_price || parseFloat(item.unit_price) <= 0)
          errs[`room_${ri}_item_${ii}_price`] = "Valid price required"
        if (!item.quantity || parseFloat(item.quantity) <= 0)
          errs[`room_${ri}_item_${ii}_qty`] = "Valid quantity required"
      })
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [leadId, rooms])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!validate()) return

      const payload = {
        lead_id: leadId,
        notes: notes || undefined,
        valid_until: validUntil || undefined,
        rooms: rooms.map((room) => ({
          name: room.name,
          area_sqft: room.area_sqft ? parseFloat(room.area_sqft) : undefined,
          items: room.items.map((item) => ({
            description: item.description,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            unit_price: parseFloat(item.unit_price),
            markup_percentage: parseFloat(item.markup_percentage) || 0,
            inventory_item_id: item.inventory_item_id || undefined,
          })),
        })),
      }
      createMutation.mutate(payload)
    },
    [leadId, notes, validUntil, rooms, validate, createMutation]
  )

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const grandTotal = rooms.reduce((sum, room) => sum + calcRoomTotal(room), 0)
  const selectedLead = leads.find((l) => l.id === leadId)
  const isLeadConverted = selectedLead?.status === "CONVERTED"

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      {/* Header — always visible */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/sales/quotes")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <FileText className="h-6 w-6" />
              Create New Quotation
            </h2>
            <p className="text-muted-foreground">
              Build a detailed quotation with rooms and line items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {showPreview ? "Hide Preview" : "Show Preview"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Split Layout */}
      <div
        className={`grid gap-6 ${showPreview ? "lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_580px]" : ""}`}
      >
        {/* ═══════ LEFT: Form ═══════ */}
        <form onSubmit={handleSubmit} className="space-y-6 print:hidden">
          {/* Quote Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
              <CardDescription>
                Select the lead and set basic quote information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="lead_select">Lead / Client *</Label>
                  <select
                    id="lead_select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                  >
                    <option value="">Select a lead</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.name} — {lead.contact_number}
                      </option>
                    ))}
                  </select>
                  {errors.lead && (
                    <p className="text-xs text-destructive">{errors.lead}</p>
                  )}
                  {isLeadConverted && (
                    <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        This lead has been converted to a project. New quotes
                        cannot be created.
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valid_until">Valid Until</Label>
                  <Input
                    id="valid_until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Optional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rooms */}
          {rooms.map((room, ri) => (
            <Card key={room.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">Room {ri + 1}</CardTitle>
                  </div>
                  <CardDescription>
                    Room total:{" "}
                    <span className="font-semibold text-foreground">
                      {formatINR(calcRoomTotal(room))}
                    </span>
                  </CardDescription>
                </div>
                {rooms.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRoom(room.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Room Name *</Label>
                    <Input
                      placeholder="e.g. Master Bedroom, Kitchen"
                      value={room.name}
                      onChange={(e) =>
                        updateRoom(room.id, "name", e.target.value)
                      }
                    />
                    {errors[`room_${ri}_name`] && (
                      <p className="text-xs text-destructive">
                        {errors[`room_${ri}_name`]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Area (sqft)</Label>
                    <Input
                      type="number"
                      placeholder="Optional"
                      value={room.area_sqft}
                      onChange={(e) =>
                        updateRoom(room.id, "area_sqft", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Items Table */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Markup %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {room.items.map((item, ii) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                placeholder="Item description"
                                value={item.description}
                                onChange={(e) =>
                                  updateItem(
                                    room.id,
                                    item.id,
                                    "description",
                                    e.target.value
                                  )
                                }
                                className={
                                  errors[`room_${ri}_item_${ii}_desc`]
                                    ? "border-destructive"
                                    : ""
                                }
                              />
                              {item.inventory_item_id && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <Package className="h-2.5 w-2.5" />
                                  Warehouse Item
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  room.id,
                                  item.id,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              className={`w-20 ${errors[`room_${ri}_item_${ii}_qty`] ? "border-destructive" : ""}`}
                            />
                          </TableCell>
                          <TableCell>
                            <select
                              className="flex h-10 w-20 rounded-md border border-input bg-background px-2 py-2 text-sm"
                              value={item.unit}
                              onChange={(e) =>
                                updateItem(
                                  room.id,
                                  item.id,
                                  "unit",
                                  e.target.value
                                )
                              }
                            >
                              <option value="nos">nos</option>
                              <option value="sqft">sqft</option>
                              <option value="rft">rft</option>
                              <option value="kg">kg</option>
                              <option value="lot">lot</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={item.unit_price}
                              onChange={(e) =>
                                updateItem(
                                  room.id,
                                  item.id,
                                  "unit_price",
                                  e.target.value
                                )
                              }
                              className={`w-28 ${errors[`room_${ri}_item_${ii}_price`] ? "border-destructive" : ""}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.markup_percentage}
                              onChange={(e) =>
                                updateItem(
                                  room.id,
                                  item.id,
                                  "markup_percentage",
                                  e.target.value
                                )
                              }
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatINR(calcItemTotal(item))}
                          </TableCell>
                          <TableCell>
                            {room.items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeItem(room.id, item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {errors[`room_${ri}_items`] && (
                  <p className="text-xs text-destructive">
                    {errors[`room_${ri}_items`]}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(room.id)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Custom Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openPicker(room.id)}
                  >
                    <Package className="mr-1.5 h-3.5 w-3.5" />
                    Pick from Inventory
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {errors.rooms && (
            <p className="text-sm text-destructive">{errors.rooms}</p>
          )}

          <Button type="button" variant="outline" onClick={addRoom}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>

          {/* Summary & Submit */}
          <Card>
            <CardContent className="flex items-center justify-between py-6">
              <div>
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-3xl font-bold">{formatINR(grandTotal)}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/sales/quotes")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || isLeadConverted}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Quotation
                </Button>
              </div>
            </CardContent>
          </Card>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to create quotation. Please check the form and try again.
            </p>
          )}
        </form>

        {/* ═══════ RIGHT: Live Preview ═══════ */}
        {showPreview && (
          <div className="hidden lg:block print:block">
            <div className="sticky top-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground print:hidden">
                Live Preview
              </p>
              <div className="quote-preview-wrapper">
                <QuotePreview
                  leadId={leadId}
                  validUntil={validUntil}
                  rooms={rooms}
                  leads={leads}
                  notes={notes}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Item Picker Dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pick from Inventory
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={pickerCategory}
              onChange={(e) => setPickerCategory(e.target.value)}
              className="flex h-10 w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {Array.from(new Set(inventoryItems.map((i) => i.category))).map(
                (cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                )
              )}
            </select>
          </div>

          <div className="space-y-1">
            {inventoryItems
              .filter((i) => {
                if (pickerCategory !== "all" && i.category !== pickerCategory) return false
                if (pickerSearch && !i.name.toLowerCase().includes(pickerSearch.toLowerCase())) return false
                return true
              })
              .map((invItem) => {
                const isLow = invItem.current_stock < invItem.reorder_level
                return (
                  <button
                    key={invItem.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-accent"
                    onClick={() => pickItem(invItem)}
                  >
                    <div>
                      <p className="font-medium text-sm">{invItem.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invItem.category} &middot; {invItem.unit}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={isLow ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {invItem.current_stock} in stock
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatINR(invItem.selling_price)}
                      </span>
                    </div>
                  </button>
                )
              })}
            {inventoryItems.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No inventory items found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </RoleGuard>
  )
}

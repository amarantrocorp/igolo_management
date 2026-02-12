"use client"

import { useState, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import RoleGuard from "@/components/auth/role-guard"
import QuotePreview from "@/components/sales/quote-preview"
import type { QuoteItemForm, QuoteRoomForm } from "@/types/quote"
import { calcItemTotal, calcRoomTotal, formatINR } from "@/types/quote"
import type { Lead } from "@/types"
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
} from "@/components/ui/dialog"
import {
  FileText,
  ArrowLeft,
  Printer,
  Pencil,
  Loader2,
  CheckCircle,
  Send,
  Plus,
  Trash2,
  Home,
  X,
  Rocket,
} from "lucide-react"

// ---------- API response types ----------

interface ApiQuoteItem {
  id: string
  description: string
  quantity: number
  unit: string
  unit_price: number | string
  markup_percentage: number
  final_price: number | string
  inventory_item_id?: string | null
}

interface ApiQuoteRoom {
  id: string
  name: string
  area_sqft: number | null
  items: ApiQuoteItem[]
}

interface ApiQuotation {
  id: string
  lead_id: string
  lead?: Lead
  version: number
  total_amount: number | string
  status: string
  valid_until: string | null
  notes: string | null
  created_by_id: string
  project_id?: string | null
  rooms: ApiQuoteRoom[]
  created_at: string
  updated_at: string
}

// ... (retain helpers)



// ---------- Helpers ----------

function apiRoomToForm(room: ApiQuoteRoom): QuoteRoomForm {
  return {
    id: room.id,
    name: room.name,
    area_sqft: room.area_sqft != null ? String(room.area_sqft) : "",
    items: room.items.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit,
      unit_price: String(item.unit_price),
      markup_percentage: String(item.markup_percentage),
    })),
  }
}

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

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>
    case "SENT":
      return <Badge>Sent</Badge>
    case "APPROVED":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
          Approved
        </Badge>
      )
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>
    case "ARCHIVED":
      return <Badge variant="outline">Archived</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function QuoteViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const userRole = useAuthStore((s) => s.user?.role)
  const canEdit = userRole !== "BDE"

  const [editMode, setEditMode] = useState(false)
  const [editRooms, setEditRooms] = useState<QuoteRoomForm[]>([])
  const [editNotes, setEditNotes] = useState("")
  const [editValidUntil, setEditValidUntil] = useState("")

  // Convert to Project dialog state
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertName, setConvertName] = useState("")
  const [convertStartDate, setConvertStartDate] = useState("")
  const [convertSiteAddress, setConvertSiteAddress] = useState("")

  // Fetch quote
  const {
    data: quote,
    isLoading,
    isError,
  } = useQuery<ApiQuotation>({
    queryKey: ["quotation", id],
    queryFn: async () => {
      const res = await api.get(`/quotes/${id}`)
      return res.data
    },
  })

  // Fetch leads for preview
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["leads-for-quote"],
    queryFn: async () => {
      const res = await api.get("/crm/leads")
      return res.data.items ?? res.data
    },
  })

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await api.patch(`/quotes/quotes/${id}/status`, {
        status: newStatus,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation", id] })
      queryClient.invalidateQueries({ queryKey: ["quotations"] })
    },
  })

  // Derived data from API response
  const viewRooms: QuoteRoomForm[] = useMemo(() => {
    if (!quote) return []
    return quote.rooms.map(apiRoomToForm)
  }, [quote])

  const lead = quote?.lead || leads.find((l) => l.id === quote?.lead_id)

  // Convert to Project mutation
  const convertMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Ensure a Client record exists for this lead.
      // If it doesn't, auto-convert the lead to a client first.
      if (quote?.lead_id) {
        try {
          await api.post(`/crm/leads/${quote.lead_id}/convert`)
        } catch {
          // Ignore — client may already exist
        }
      }

      // Step 2: Create the project
      const res = await api.post(`/projects/convert/${id}`, {
        quotation_id: id,
        start_date: convertStartDate,
        name: convertName,
        site_address: convertSiteAddress || undefined,
      })
      return res.data
    },
    onSuccess: (data: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["quotation", id] })
      queryClient.invalidateQueries({ queryKey: ["leads-for-quote"] })
      setShowConvertDialog(false)
      router.push(`/dashboard/projects/${data.id}`)
    },
  })

  const openConvertDialog = useCallback(() => {
    setConvertName(lead?.name ? `${lead.name} - Interior Project` : "")
    setConvertStartDate("")
    setConvertSiteAddress("")
    setShowConvertDialog(true)
  }, [lead])

  // ── Edit mode helpers ──

  const enterEditMode = useCallback(() => {
    if (!quote) return
    setEditRooms(quote.rooms.map(apiRoomToForm))
    setEditNotes(quote.notes || "")
    setEditValidUntil(
      quote.valid_until ? quote.valid_until.slice(0, 10) : ""
    )
    setEditMode(true)
  }, [quote])

  const exitEditMode = useCallback(() => {
    setEditMode(false)
  }, [])

  // Room/item CRUD for edit mode
  const addRoom = useCallback(() => {
    setEditRooms((prev) => [...prev, newRoom()])
  }, [])

  const removeRoom = useCallback((roomId: string) => {
    setEditRooms((prev) => prev.filter((r) => r.id !== roomId))
  }, [])

  const updateRoom = useCallback(
    (roomId: string, field: keyof QuoteRoomForm, value: string) => {
      setEditRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, [field]: value } : r))
      )
    },
    []
  )

  const addItem = useCallback((roomId: string) => {
    setEditRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, items: [...r.items, newItem()] } : r
      )
    )
  }, [])

  const removeItem = useCallback((roomId: string, itemId: string) => {
    setEditRooms((prev) =>
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
      setEditRooms((prev) =>
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

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  // ── For preview props ──
  const previewRooms = editMode ? editRooms : viewRooms
  const previewNotes = editMode ? editNotes : quote?.notes || ""
  const previewValidUntil = editMode
    ? editValidUntil
    : quote?.valid_until?.slice(0, 10) || ""
  const grandTotal = previewRooms.reduce(
    (sum, room) => sum + calcRoomTotal(room),
    0
  )

  // ── Loading / Error states ──
  if (isLoading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </RoleGuard>
    )
  }

  if (isError || !quote) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">
            Quotation not found or failed to load.
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/sales/quotes")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotations
          </Button>
        </div>
      </RoleGuard>
    )
  }

  const isDraft = quote.status === "DRAFT"
  const isLeadConverted = lead?.status === "CONVERTED"
  const quoteNumber = `QT-${quote.id.slice(0, 8).toUpperCase()}`
  const quoteDate = new Date(quote.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      {/* ── Header ── */}
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
            <div className="flex items-center gap-3">
              <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <FileText className="h-6 w-6" />
                {quoteNumber}
              </h2>
              {getStatusBadge(quote.status)}
              <Badge variant="outline">v{quote.version}</Badge>
            </div>
            <p className="text-muted-foreground">
              {lead?.name || "Unknown Client"} &middot;{" "}
              {formatINR(Number(quote.total_amount))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit toggle for drafts — hidden for BDE and once lead is converted */}
          {canEdit && isDraft && !editMode && !isLeadConverted && (
            <Button variant="outline" size="sm" onClick={enterEditMode}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {editMode && (
            <Button variant="outline" size="sm" onClick={exitEditMode}>
              <X className="mr-2 h-4 w-4" />
              Cancel Edit
            </Button>
          )}

          {/* Status actions — hidden for BDE and once lead is converted */}
          {canEdit && isDraft && !editMode && !isLeadConverted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => statusMutation.mutate("SENT")}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Mark as Sent
            </Button>
          )}
          {canEdit && quote.status === "SENT" && !isLeadConverted && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => statusMutation.mutate("APPROVED")}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          )}

          {/* Convert to Project — hidden for BDE, only for APPROVED quotes without an existing project */}
          {canEdit && quote.status === "APPROVED" && !quote.project_id && (
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={openConvertDialog}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Convert to Project
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {statusMutation.isError && (
        <p className="text-sm text-destructive mb-4 print:hidden">
          Failed to update status. Please try again.
        </p>
      )}

      {/* ── Content ── */}
      {editMode ? (
        /* ═══════ EDIT MODE: Split Layout ═══════ */
        <div className="grid gap-6 lg:grid-cols-[1fr_520px] xl:grid-cols-[1fr_580px]">
          {/* LEFT: Edit form */}
          <div className="space-y-6 print:hidden">
            {/* Quote meta */}
            <Card>
              <CardHeader>
                <CardTitle>Quote Details</CardTitle>
                <CardDescription>Edit quote information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input
                      type="date"
                      value={editValidUntil}
                      onChange={(e) => setEditValidUntil(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional notes..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rooms */}
            {editRooms.map((room, ri) => (
              <Card key={room.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <Home className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">
                        Room {ri + 1}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Room total:{" "}
                      <span className="font-semibold text-foreground">
                        {formatINR(calcRoomTotal(room))}
                      </span>
                    </CardDescription>
                  </div>
                  {editRooms.length > 1 && (
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

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[30%]">
                            Description
                          </TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Markup %</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {room.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
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
                              />
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
                                className="w-20"
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
                                className="w-28"
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
                                  onClick={() =>
                                    removeItem(room.id, item.id)
                                  }
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

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addItem(room.id)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Item
                  </Button>
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={addRoom}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>

            {/* Grand total in edit mode */}
            <Card>
              <CardContent className="flex items-center justify-between py-6">
                <div>
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-3xl font-bold">
                    {formatINR(grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Live Preview */}
          <div className="hidden lg:block print:block">
            <div className="sticky top-6">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground print:hidden">
                Live Preview
              </p>
              <div className="quote-preview-wrapper">
                <QuotePreview
                  leadId={quote.lead_id}
                  validUntil={previewValidUntil}
                  rooms={previewRooms}
                  leads={leads}
                  notes={previewNotes}
                  clientName={lead?.name}
                  clientPhone={lead?.contact_number}
                  quoteNumber={quoteNumber}
                  quoteDate={quoteDate}
                  version={quote.version}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════ VIEW MODE: Centred Preview ═══════ */
        <div className="max-w-3xl mx-auto">
          <div className="quote-preview-wrapper">
            <QuotePreview
              leadId={quote.lead_id}
              validUntil={previewValidUntil}
              rooms={viewRooms}
              leads={leads}
              notes={quote.notes || ""}
              clientName={lead?.name}
              clientPhone={lead?.contact_number}
              quoteNumber={quoteNumber}
              quoteDate={quoteDate}
              version={quote.version}
            />
          </div>

          {/* Summary bar below preview */}
          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground print:hidden">
            <span>
              Created{" "}
              {new Date(quote.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}{" "}
              &middot; Last updated{" "}
              {new Date(quote.updated_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span>
              {quote.rooms.length} room(s) &middot;{" "}
              {quote.rooms.reduce((s, r) => s + r.items.length, 0)} item(s)
            </span>
          </div>
        </div>
      )}

      {/* ── Convert to Project Dialog ── */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-blue-600" />
              Convert to Project
            </DialogTitle>
            <DialogDescription>
              This will create a new project from this approved quotation with 6
              standard execution sprints.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                placeholder="e.g. Villa 402 - Full Interior"
                value={convertName}
                onChange={(e) => setConvertName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={convertStartDate}
                onChange={(e) => setConvertStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Site Address</Label>
              <Input
                placeholder="Optional site address"
                value={convertSiteAddress}
                onChange={(e) => setConvertSiteAddress(e.target.value)}
              />
            </div>
          </div>

          {convertMutation.isError && (
            <p className="text-sm text-destructive">
              {(convertMutation.error as any)?.response?.data?.detail ||
                "Failed to convert. Please try again."}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={convertMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={
                !convertName.trim() ||
                !convertStartDate ||
                convertMutation.isPending
              }
              onClick={() => convertMutation.mutate()}
            >
              {convertMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RoleGuard>
  )
}

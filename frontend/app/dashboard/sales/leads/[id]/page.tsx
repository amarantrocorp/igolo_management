"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Lead, Quotation } from "@/types"
import { formatINR } from "@/types/quote"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Calendar,
  User as UserIcon,
  FileText,
  Plus,
  Eye,
  Printer,
  Lock,
  Pencil,
  Save,
  X,
} from "lucide-react"

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "NEW":
      return "default" as const
    case "CONTACTED":
    case "QUALIFIED":
      return "secondary" as const
    case "QUOTATION_SENT":
    case "NEGOTIATION":
      return "warning" as const
    case "CONVERTED":
      return "success" as const
    case "LOST":
      return "destructive" as const
    default:
      return "secondary" as const
  }
}

function getQuoteStatusVariant(status: string) {
  switch (status) {
    case "DRAFT":
      return "secondary" as const
    case "SENT":
      return "default" as const
    case "APPROVED":
      return "success" as const
    case "REJECTED":
      return "destructive" as const
    case "ARCHIVED":
      return "outline" as const
    default:
      return "secondary" as const
  }
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<"overview" | "quotations">(
    "overview"
  )
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    name: "",
    contact_number: "",
    email: "",
    location: "",
    budget_range: "",
    notes: "",
    source: "",
  })

  // Fetch lead details
  const {
    data: lead,
    isLoading,
    isError,
  } = useQuery<Lead>({
    queryKey: ["lead", id],
    queryFn: async () => {
      const res = await api.get(`/crm/leads/${id}`)
      return res.data
    },
  })

  // Fetch quotations for this lead
  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ["quotations-for-lead", id],
    queryFn: async () => {
      const res = await api.get(`/quotes?lead_id=${id}`)
      return res.data.items ?? res.data
    },
    enabled: !!id,
  })

  // Update lead mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const res = await api.put(`/crm/leads/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setEditMode(false)
    },
  })

  const enterEditMode = useCallback(() => {
    if (!lead) return
    setEditData({
      name: lead.name,
      contact_number: lead.contact_number,
      email: (lead as any).email || "",
      location: (lead as any).location || "",
      budget_range: (lead as any).budget_range || "",
      notes: lead.notes || "",
      source: lead.source,
    })
    setEditMode(true)
  }, [lead])

  const isConverted = lead?.status === "CONVERTED"

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </RoleGuard>
    )
  }

  if (isError || !lead) {
    return (
      <RoleGuard allowedRoles={ALLOWED_ROLES}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Lead not found.</p>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/sales/leads")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Button>
        </div>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/sales/leads")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">
                  {lead.name}
                </h2>
                <Badge variant={getStatusBadgeVariant(lead.status)}>
                  {lead.status.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {lead.source} &middot; Added{" "}
                {new Date(lead.created_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isConverted && !editMode && (
              <Button variant="outline" size="sm" onClick={enterEditMode}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {editMode && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={updateMutation.isPending}
                  onClick={() => updateMutation.mutate(editData)}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              </>
            )}
            {!isConverted && (
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/dashboard/sales/quotes/new?lead_id=${lead.id}`)
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            )}
            {isConverted && (
              <Button size="sm" disabled variant="outline">
                <Lock className="mr-2 h-4 w-4" />
                Converted — Quotes Locked
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "quotations"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("quotations")}
          >
            Quotations ({quotations.length})
          </button>
        </div>

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={editData.name}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editData.contact_number}
                        onChange={(e) =>
                          setEditData((p) => ({
                            ...p,
                            contact_number: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="Optional"
                        value={editData.email}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="Optional"
                        value={editData.location}
                        onChange={(e) =>
                          setEditData((p) => ({
                            ...p,
                            location: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{lead.contact_number}</span>
                    </div>
                    {(lead as any).email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{(lead as any).email}</span>
                      </div>
                    )}
                    {(lead as any).location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {(lead as any).location}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Assigned to{" "}
                        <strong>
                          {lead.assigned_to?.full_name ?? "Unassigned"}
                        </strong>
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lead Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={editData.source}
                        onChange={(e) =>
                          setEditData((p) => ({
                            ...p,
                            source: e.target.value,
                          }))
                        }
                      >
                        {[
                          "Website",
                          "Referral",
                          "Social Media",
                          "Walk-in",
                          "Advertisement",
                          "Real Estate Partner",
                          "Other",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Budget Range</Label>
                      <Input
                        placeholder="e.g. 5L - 10L"
                        value={editData.budget_range}
                        onChange={(e) =>
                          setEditData((p) => ({
                            ...p,
                            budget_range: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <textarea
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Notes about this lead..."
                        value={editData.notes}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, notes: e.target.value }))
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Source
                      </span>
                      <Badge variant="outline">{lead.source}</Badge>
                    </div>
                    {(lead as any).budget_range && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Budget
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {(lead as any).budget_range}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Created
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(lead.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    {lead.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          NOTES
                        </p>
                        <p className="text-sm">{lead.notes}</p>
                      </div>
                    )}
                  </>
                )}

                {updateMutation.isError && (
                  <p className="text-sm text-destructive">
                    Failed to update lead. Please try again.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="md:col-span-2">
              <CardContent className="py-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{quotations.length}</p>
                    <p className="text-xs text-muted-foreground">
                      Total Quotes
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {
                        quotations.filter((q) => q.status === "APPROVED")
                          .length
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {quotations.length > 0
                        ? formatINR(
                            Math.max(
                              ...quotations.map((q) => Number(q.total_amount))
                            )
                          )
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Highest Quote
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Quotations Tab ── */}
        {activeTab === "quotations" && (
          <div className="space-y-4">
            {quotations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No quotations yet for this lead.
                  </p>
                  {!isConverted && (
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/dashboard/sales/quotes/new?lead_id=${lead.id}`
                        )
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Quote
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {quotations.map((quote, idx) => (
                  <Card
                    key={quote.id}
                    className="cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() =>
                      router.push(`/dashboard/sales/quotes/${quote.id}`)
                    }
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                          v{quote.version}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              QT-
                              {quote.id.slice(0, 8).toUpperCase()}
                            </p>
                            <Badge
                              variant={getQuoteStatusVariant(quote.status)}
                            >
                              {quote.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(quote.created_at).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )}{" "}
                            &middot;{" "}
                            {(quote as any).rooms?.length ?? 0} room(s)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold tabular-nums">
                          {formatINR(Number(quote.total_amount))}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(
                              `/dashboard/sales/quotes/${quote.id}`
                            )
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}

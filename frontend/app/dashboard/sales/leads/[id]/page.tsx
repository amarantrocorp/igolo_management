"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import RoleGuard from "@/components/auth/role-guard"
import type { Lead, Quotation } from "@/types"
import { formatINR } from "@/types/quote"
import { FileUpload } from "@/components/ui/file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Lock,
  Pencil,
  Save,
  X,
  Building2,
  Ruler,
  Paintbrush,
  Clock,
} from "lucide-react"

const LEAD_SOURCES = [
  "Website", "Referral", "Social Media", "Walk-in",
  "Advertisement", "Real Estate Partner", "Other",
]

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "INDEPENDENT_HOUSE", label: "Independent House" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "STUDIO", label: "Studio" },
  { value: "OFFICE", label: "Office" },
  { value: "RETAIL", label: "Retail" },
  { value: "OTHER", label: "Other" },
]

const PROPERTY_STATUSES = [
  { value: "UNDER_CONSTRUCTION", label: "Under Construction" },
  { value: "READY_TO_MOVE", label: "Ready to Move" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "RENOVATION", label: "Renovation" },
]

const SCOPE_OPTIONS = [
  "Full Home Interior", "Kitchen", "Living Room", "Bedroom(s)",
  "Bathroom(s)", "False Ceiling", "Painting", "Electrical",
  "Flooring", "Furniture Only",
]

const DESIGN_STYLES = [
  "Modern", "Contemporary", "Minimalist", "Traditional",
  "Industrial", "Scandinavian", "Bohemian", "Other",
]

const BUDGET_RANGES = [
  "Under 5 Lakhs", "5 - 10 Lakhs", "10 - 20 Lakhs",
  "20 - 50 Lakhs", "50 Lakhs - 1 Crore", "Above 1 Crore",
]

const SITE_VISIT_OPTIONS = [
  { value: "WEEKDAYS", label: "Weekdays" },
  { value: "WEEKENDS", label: "Weekends" },
  { value: "ANYTIME", label: "Anytime" },
  { value: "NOT_AVAILABLE", label: "Not Available" },
]

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"

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

function formatLabel(val: string) {
  return val.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canManageQuotes = userRole !== "BDE"

  const [activeTab, setActiveTab] = useState<"overview" | "quotations">(
    "overview"
  )
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({
    name: "",
    contact_number: "",
    email: "",
    location: "",
    source: "",
    notes: "",
    property_type: "",
    property_status: "",
    carpet_area: "",
    scope_of_work: [] as string[],
    floor_plan_url: "",
    budget_range: "",
    design_style: "",
    possession_date: "",
    site_visit_availability: "",
  })

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

  const { data: quotations = [] } = useQuery<Quotation[]>({
    queryKey: ["quotations-for-lead", id],
    queryFn: async () => {
      const res = await api.get(`/quotes?lead_id=${id}`)
      return res.data.items ?? res.data
    },
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const payload: Record<string, unknown> = {}
      if (data.name) payload.name = data.name
      if (data.contact_number) payload.contact_number = data.contact_number
      if (data.email) payload.email = data.email
      payload.location = data.location || null
      payload.source = data.source
      payload.notes = data.notes || null
      payload.property_type = data.property_type || null
      payload.property_status = data.property_status || null
      payload.carpet_area = data.carpet_area ? Number(data.carpet_area) : null
      payload.scope_of_work = data.scope_of_work.length > 0 ? data.scope_of_work : null
      payload.floor_plan_url = data.floor_plan_url || null
      payload.budget_range = data.budget_range || null
      payload.design_style = data.design_style || null
      payload.possession_date = data.possession_date || null
      payload.site_visit_availability = data.site_visit_availability || null
      const res = await api.put(`/crm/leads/${id}`, payload)
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
      email: lead.email || "",
      location: lead.location || "",
      source: lead.source,
      notes: lead.notes || "",
      property_type: lead.property_type || "",
      property_status: lead.property_status || "",
      carpet_area: lead.carpet_area ? String(lead.carpet_area) : "",
      scope_of_work: lead.scope_of_work || [],
      floor_plan_url: lead.floor_plan_url || "",
      budget_range: lead.budget_range || "",
      design_style: lead.design_style || "",
      possession_date: lead.possession_date || "",
      site_visit_availability: lead.site_visit_availability || "",
    })
    setEditMode(true)
  }, [lead])

  const toggleScope = useCallback((scope: string) => {
    setEditData((prev) => ({
      ...prev,
      scope_of_work: prev.scope_of_work.includes(scope)
        ? prev.scope_of_work.filter((s) => s !== scope)
        : [...prev.scope_of_work, scope],
    }))
  }, [])

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
        {/* Header */}
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
            {canManageQuotes && !isConverted && (
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

        {/* Tabs */}
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

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
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
                    </div>
                    <div className="space-y-2">
                      <Label>Source</Label>
                      <select
                        className={selectClass}
                        value={editData.source}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, source: e.target.value }))
                        }
                      >
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{lead.contact_number}</span>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.email}</span>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Assigned to{" "}
                        <strong>{lead.assigned_to?.full_name ?? "Unassigned"}</strong>
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-muted-foreground">Source</span>
                      <Badge variant="outline">{lead.source}</Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Project Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Property Type</Label>
                        <select
                          className={selectClass}
                          value={editData.property_type}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, property_type: e.target.value }))
                          }
                        >
                          <option value="">Not specified</option>
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Property Status</Label>
                        <select
                          className={selectClass}
                          value={editData.property_status}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, property_status: e.target.value }))
                          }
                        >
                          <option value="">Not specified</option>
                          {PROPERTY_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Carpet Area (sqft)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 1200"
                        value={editData.carpet_area}
                        onChange={(e) =>
                          setEditData((p) => ({ ...p, carpet_area: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Scope of Work</Label>
                      <div className="flex flex-wrap gap-2">
                        {SCOPE_OPTIONS.map((scope) => {
                          const selected = editData.scope_of_work.includes(scope)
                          return (
                            <button
                              key={scope}
                              type="button"
                              onClick={() => toggleScope(scope)}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                selected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-input bg-background text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {scope}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <FileUpload
                      value={editData.floor_plan_url || null}
                      onChange={(url) =>
                        setEditData((p) => ({ ...p, floor_plan_url: url || "" }))
                      }
                      category="leads"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      maxSizeMB={25}
                      label="Floor Plan"
                    />
                  </>
                ) : (
                  <>
                    {lead.property_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Property</span>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatLabel(lead.property_type)}
                          </span>
                        </div>
                      </div>
                    )}
                    {lead.property_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant="outline">{formatLabel(lead.property_status)}</Badge>
                      </div>
                    )}
                    {lead.carpet_area && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Area</span>
                        <div className="flex items-center gap-1.5">
                          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{lead.carpet_area} sqft</span>
                        </div>
                      </div>
                    )}
                    {lead.scope_of_work && lead.scope_of_work.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Scope</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.scope_of_work.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {lead.floor_plan_url && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Floor Plan</p>
                        {/\.(jpg|jpeg|png|webp|gif)$/i.test(lead.floor_plan_url) ? (
                          <a href={lead.floor_plan_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={lead.floor_plan_url}
                              alt="Floor Plan"
                              className="max-h-40 rounded-md border object-contain"
                            />
                          </a>
                        ) : (
                          <a
                            href={lead.floor_plan_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                          >
                            <FileText className="h-4 w-4" />
                            View Floor Plan
                          </a>
                        )}
                      </div>
                    )}
                    {!lead.property_type && !lead.carpet_area && (!lead.scope_of_work || lead.scope_of_work.length === 0) && !lead.floor_plan_url && (
                      <p className="text-sm text-muted-foreground">
                        No project details captured yet. Click Edit to add.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {editMode ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Budget Range</Label>
                        <select
                          className={selectClass}
                          value={editData.budget_range}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, budget_range: e.target.value }))
                          }
                        >
                          <option value="">Not specified</option>
                          {BUDGET_RANGES.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Design Style</Label>
                        <select
                          className={selectClass}
                          value={editData.design_style}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, design_style: e.target.value }))
                          }
                        >
                          <option value="">Not specified</option>
                          {DESIGN_STYLES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Possession Date</Label>
                        <Input
                          type="date"
                          value={editData.possession_date}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, possession_date: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Site Visit Availability</Label>
                        <select
                          className={selectClass}
                          value={editData.site_visit_availability}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, site_visit_availability: e.target.value }))
                          }
                        >
                          <option value="">Not specified</option>
                          {SITE_VISIT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
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
                    {lead.budget_range && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Budget</span>
                        <div className="flex items-center gap-1.5">
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{lead.budget_range}</span>
                        </div>
                      </div>
                    )}
                    {lead.design_style && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Style</span>
                        <div className="flex items-center gap-1.5">
                          <Paintbrush className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{lead.design_style}</span>
                        </div>
                      </div>
                    )}
                    {lead.possession_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Possession</span>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(lead.possession_date).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                    {lead.site_visit_availability && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Site Visit</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatLabel(lead.site_visit_availability)}
                          </span>
                        </div>
                      </div>
                    )}
                    {!lead.budget_range && !lead.design_style && !lead.possession_date && !lead.site_visit_availability && (
                      <p className="text-sm text-muted-foreground">
                        No preferences captured yet. Click Edit to add.
                      </p>
                    )}
                    {lead.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">NOTES</p>
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

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{quotations.length}</p>
                    <p className="text-xs text-muted-foreground">Total Quotes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {quotations.filter((q) => q.status === "APPROVED").length}
                    </p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {quotations.length > 0
                        ? formatINR(Math.max(...quotations.map((q) => Number(q.total_amount))))
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Highest Quote</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {new Date(lead.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quotations Tab */}
        {activeTab === "quotations" && (
          <div className="space-y-4">
            {quotations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No quotations yet for this lead.
                  </p>
                  {canManageQuotes && !isConverted && (
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(`/dashboard/sales/quotes/new?lead_id=${lead.id}`)
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
                {quotations.map((quote) => (
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
                              QT-{quote.id.slice(0, 8).toUpperCase()}
                            </p>
                            <Badge variant={getQuoteStatusVariant(quote.status)}>
                              {quote.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(quote.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}{" "}
                            &middot; {(quote as any).rooms?.length ?? 0} room(s)
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
                            router.push(`/dashboard/sales/quotes/${quote.id}`)
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

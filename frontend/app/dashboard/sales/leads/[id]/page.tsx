"use client"

import { useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import RoleGuard from "@/components/auth/role-guard"
import type { Lead, LeadActivity, Quotation } from "@/types"
import { formatINR } from "@/types/quote"
import { FileUpload } from "@/components/ui/file-upload"
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Calendar,
  User as UserIcon,
  Users,
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
  AlertCircle,
  MessageSquare,
  UserCheck,
} from "lucide-react"

// ── Constants (aligned with create page) ──

const LEAD_SOURCES = [
  "Website", "Referral", "Instagram", "Facebook", "Google Ads",
  "Walk-in", "Real Estate Partner", "Just Dial", "Housing.com", "Other",
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
  { value: "OTHER", label: "Other" },
]

const SCOPE_OPTIONS = [
  "Full Home Interior", "Kitchen", "Living Room", "Bedroom(s)",
  "Bathroom(s)", "False Ceiling", "Painting", "Electrical",
  "Flooring", "Furniture Only", "Modular Kitchen", "Wardrobe",
  "TV Unit", "Study Room", "Pooja Room",
]

const DESIGN_STYLES = [
  "Modern", "Contemporary", "Minimalist", "Traditional",
  "Industrial", "Scandinavian", "Bohemian", "Luxury", "Transitional", "Other",
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
  { value: "OTHER", label: "Other" },
]

// ── Input Filters ──

function filterPhone(value: string): string {
  return value.replace(/[^\d+\s\-()]/g, "")
}

function filterName(value: string): string {
  return value.replace(/[^a-zA-Z\s.'\-]/g, "")
}

function filterDecimal(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "")
  const parts = cleaned.split(".")
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("")
  return cleaned
}

// ── Validation ──

const MAX_NAME_LENGTH = 100
const MAX_NOTES_LENGTH = 1000
const MAX_OTHER_LENGTH = 100
const MAX_CARPET_AREA = 50000

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "")
  return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned) || /^\+?[\d]{7,15}$/.test(cleaned)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type EditFormData = {
  name: string
  contact_number: string
  email: string
  location: string
  source: string
  source_other: string
  notes: string
  property_type: string
  property_type_other: string
  property_status: string
  property_status_other: string
  carpet_area: string
  scope_of_work: string[]
  scope_other: string
  floor_plan_url: string
  budget_range: string
  design_style: string
  design_style_other: string
  possession_date: string
  site_visit_availability: string
  site_visit_other: string
}

type FormErrors = Partial<Record<keyof EditFormData, string>>

function validateEditForm(data: EditFormData): { valid: boolean; errors: FormErrors } {
  const errors: FormErrors = {}

  if (!data.name.trim() || data.name.trim().length < 2) {
    errors.name = "Name is required (min 2 characters)"
  } else if (data.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must be under ${MAX_NAME_LENGTH} characters`
  }

  if (!data.contact_number.trim()) {
    errors.contact_number = "Phone number is required"
  } else if (!validatePhone(data.contact_number)) {
    errors.contact_number = "Enter a valid phone number"
  }

  if (data.email.trim() && !validateEmail(data.email)) {
    errors.email = "Enter a valid email address"
  }

  if (!data.location.trim()) {
    errors.location = "Location is required"
  } else if (data.location.trim().length < 5) {
    errors.location = "Enter a more specific location (min 5 chars)"
  }

  if (!data.source) {
    errors.source = "Source is required"
  } else if (data.source === "Other" && !data.source_other.trim()) {
    errors.source_other = "Please specify the source"
  }

  if (data.property_type === "OTHER" && !data.property_type_other.trim()) {
    errors.property_type_other = "Please specify the property type"
  }

  if (data.property_status === "OTHER" && !data.property_status_other.trim()) {
    errors.property_status_other = "Please specify the property status"
  }

  if (data.carpet_area.trim()) {
    const area = Number(data.carpet_area)
    if (isNaN(area) || area <= 0) {
      errors.carpet_area = "Enter a valid area in sqft"
    } else if (area < 50) {
      errors.carpet_area = "Area seems too small (min 50 sqft)"
    } else if (area > MAX_CARPET_AREA) {
      errors.carpet_area = `Area too large (max ${MAX_CARPET_AREA.toLocaleString()} sqft)`
    }
  }

  if (data.scope_of_work.includes("Other") && !data.scope_other.trim()) {
    errors.scope_other = "Please specify the scope of work"
  }

  if (data.design_style === "Other" && !data.design_style_other.trim()) {
    errors.design_style_other = "Please specify the design style"
  }

  if (data.possession_date) {
    const possDate = new Date(data.possession_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (possDate < today) {
      errors.possession_date = "Possession date cannot be in the past"
    }
  }

  if (data.site_visit_availability === "OTHER" && !data.site_visit_other.trim()) {
    errors.site_visit_other = "Please specify your availability"
  }

  if (data.notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Notes must be under ${MAX_NOTES_LENGTH} characters`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Helpers ──

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none"

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

function ErrorText({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {error}
    </p>
  )
}

// ── Page Component ──

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canManageQuotes = userRole !== "BDE"

  const [activeTab, setActiveTab] = useState<"overview" | "quotations" | "activity">("overview")
  const [editMode, setEditMode] = useState(false)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [editData, setEditData] = useState<EditFormData>({
    name: "",
    contact_number: "",
    email: "",
    location: "",
    source: "",
    source_other: "",
    notes: "",
    property_type: "",
    property_type_other: "",
    property_status: "",
    property_status_other: "",
    carpet_area: "",
    scope_of_work: [],
    scope_other: "",
    floor_plan_url: "",
    budget_range: "",
    design_style: "",
    design_style_other: "",
    possession_date: "",
    site_visit_availability: "",
    site_visit_other: "",
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
    mutationFn: async (data: EditFormData) => {
      // Resolve "Other" values
      const resolvedSource = data.source === "Other" && data.source_other.trim()
        ? data.source_other.trim()
        : data.source
      const resolvedDesignStyle = data.design_style === "Other" && data.design_style_other.trim()
        ? data.design_style_other.trim()
        : data.design_style
      const resolvedScope = [...data.scope_of_work]
      if (data.scope_of_work.includes("Other") && data.scope_other.trim()) {
        const idx = resolvedScope.indexOf("Other")
        if (idx !== -1) resolvedScope[idx] = data.scope_other.trim()
      }
      const resolvedSiteVisit = data.site_visit_availability === "OTHER" && data.site_visit_other.trim()
        ? data.site_visit_other.trim()
        : data.site_visit_availability

      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        contact_number: data.contact_number.trim(),
        source: resolvedSource,
        location: data.location.trim() || null,
        email: data.email.trim() || null,
        notes: data.notes.trim() || null,
        property_type: data.property_type || null,
        property_status: data.property_status === "OTHER" ? "OTHER" : (data.property_status || null),
        carpet_area: data.carpet_area ? Number(data.carpet_area) : null,
        scope_of_work: resolvedScope.length > 0 ? resolvedScope : null,
        floor_plan_url: data.floor_plan_url || null,
        budget_range: data.budget_range || null,
        design_style: resolvedDesignStyle || null,
        possession_date: data.possession_date || null,
        site_visit_availability: resolvedSiteVisit || null,
      }

      // Append "Other" detail to notes
      if (data.property_type === "OTHER" && data.property_type_other.trim()) {
        const extra = `Property Type: ${data.property_type_other.trim()}`
        payload.notes = payload.notes ? `${payload.notes}\n${extra}` : extra
      }
      if (data.property_status === "OTHER" && data.property_status_other.trim()) {
        const extra = `Property Status: ${data.property_status_other.trim()}`
        payload.notes = payload.notes ? `${payload.notes}\n${extra}` : extra
      }

      const res = await api.put(`/crm/leads/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setEditMode(false)
      setFormErrors({})
    },
  })

  const enterEditMode = useCallback(() => {
    if (!lead) return
    setFormErrors({})
    setEditData({
      name: lead.name,
      contact_number: lead.contact_number,
      email: lead.email || "",
      location: lead.location || "",
      source: LEAD_SOURCES.includes(lead.source) ? lead.source : "Other",
      source_other: LEAD_SOURCES.includes(lead.source) ? "" : lead.source,
      notes: lead.notes || "",
      property_type: lead.property_type || "",
      property_type_other: "",
      property_status: lead.property_status || "",
      property_status_other: "",
      carpet_area: lead.carpet_area ? String(lead.carpet_area) : "",
      scope_of_work: lead.scope_of_work || [],
      scope_other: "",
      floor_plan_url: lead.floor_plan_url || "",
      budget_range: lead.budget_range || "",
      design_style: DESIGN_STYLES.includes(lead.design_style || "") ? (lead.design_style || "") : (lead.design_style ? "Other" : ""),
      design_style_other: DESIGN_STYLES.includes(lead.design_style || "") ? "" : (lead.design_style || ""),
      possession_date: lead.possession_date || "",
      site_visit_availability: lead.site_visit_availability || "",
      site_visit_other: "",
    })
    setEditMode(true)
  }, [lead])

  const setField = useCallback(<K extends keyof EditFormData>(key: K, value: EditFormData[K]) => {
    setEditData((prev) => ({ ...prev, [key]: value }))
    if (formErrors[key]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }, [formErrors])

  const toggleScope = useCallback((scope: string) => {
    setEditData((prev) => ({
      ...prev,
      scope_of_work: prev.scope_of_work.includes(scope)
        ? prev.scope_of_work.filter((s) => s !== scope)
        : [...prev.scope_of_work, scope],
    }))
  }, [])

  const handleSave = useCallback(() => {
    const { valid, errors } = validateEditForm(editData)
    setFormErrors(errors)
    if (!valid) {
      setTimeout(() => {
        const firstErr = document.querySelector("[data-error='true']")
        firstErr?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 50)
      return
    }
    updateMutation.mutate(editData)
  }, [editData, updateMutation])

  const isConverted = lead?.status === "CONVERTED"
  const hasErrors = Object.keys(formErrors).length > 0
  const { toast } = useToast()

  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertLocationAddress, setConvertLocationAddress] = useState("")
  const [convertLocationLat, setConvertLocationLat] = useState<number | null>(null)
  const [convertLocationLng, setConvertLocationLng] = useState<number | null>(null)

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.put(`/crm/leads/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      toast({ title: "Updated", description: "Lead status changed" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    },
  })

  const canConvert = !isConverted
    && quotations.some((q) => q.status === "APPROVED")
    && (userRole === "MANAGER" || userRole === "SUPER_ADMIN")

  const convertMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Convert lead to client
      await api.post(`/crm/leads/${id}/convert`)

      // Step 2: Find approved quotation and create project
      const approvedQuote = quotations.find((q) => q.status === "APPROVED")
      if (approvedQuote) {
        const startDate = new Date()
        startDate.setDate(startDate.getDate() + 7)
        const startDateStr = startDate.toISOString().split("T")[0]

        await api.post(`/projects/convert/${approvedQuote.id}`, {
          quotation_id: approvedQuote.id,
          start_date: startDateStr,
          name: lead?.name ? `${lead.name} - Interior Project` : "New Project",
          ...(convertLocationLat != null && convertLocationLng != null
            ? {
                site_latitude: convertLocationLat,
                site_longitude: convertLocationLng,
                site_address: convertLocationAddress || undefined,
              }
            : {}),
        })
      }
    },
    onSuccess: () => {
      toast({ title: "Converted", description: "Lead converted to client and project created successfully" })
      queryClient.invalidateQueries({ queryKey: ["lead", id] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["quotations-for-lead", id] })
      setShowConvertDialog(false)
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail || "Failed to convert lead"
      toast({ title: "Conversion Failed", description: detail, variant: "destructive" })
    },
  })

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
                {!editMode && !isConverted && (
                  <select
                    value={lead.status}
                    onChange={(e) => {
                      const newStatus = e.target.value
                      if (newStatus === "CONVERTED") {
                        toast({ title: "Use Convert", description: "To convert a lead, use the dedicated Convert button", variant: "destructive" })
                        return
                      }
                      statusMutation.mutate(newStatus)
                    }}
                    className="ml-2 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium"
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="QUOTATION_SENT">Quotation Sent</option>
                    <option value="NEGOTIATION">Negotiation</option>
                    <option value="LOST">Lost</option>
                  </select>
                )}
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
                  onClick={() => { setEditMode(false); setFormErrors({}) }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={updateMutation.isPending}
                  onClick={handleSave}
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
            {canConvert && (
              <Button
                size="sm"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => {
                  // Pre-fill location from lead
                  setConvertLocationAddress(lead?.location || "")
                  setConvertLocationLat(null)
                  setConvertLocationLng(null)
                  setShowConvertDialog(true)
                }}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Convert to Client
              </Button>
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

        {/* Error Banner */}
        {editMode && hasErrors && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Please fix the highlighted errors before saving.
          </div>
        )}

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
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "activity"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("activity")}
          >
            Activity
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
                      <div className="space-y-2" data-error={!!formErrors.name}>
                        <Label>Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          value={editData.name}
                          onChange={(e) => setField("name", filterName(e.target.value))}
                          maxLength={MAX_NAME_LENGTH}
                          className={formErrors.name ? "border-red-300 focus:ring-red-500" : ""}
                        />
                        <ErrorText error={formErrors.name} />
                      </div>
                      <div className="space-y-2" data-error={!!formErrors.contact_number}>
                        <Label>Phone <span className="text-red-500">*</span></Label>
                        <Input
                          value={editData.contact_number}
                          onChange={(e) => setField("contact_number", filterPhone(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key.length === 1 && !/[\d+\s\-()]/.test(e.key)) e.preventDefault()
                          }}
                          maxLength={20}
                          inputMode="tel"
                          className={formErrors.contact_number ? "border-red-300 focus:ring-red-500" : ""}
                        />
                        <ErrorText error={formErrors.contact_number} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2" data-error={!!formErrors.email}>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="Optional"
                          value={editData.email}
                          onChange={(e) => setField("email", e.target.value)}
                          className={formErrors.email ? "border-red-300 focus:ring-red-500" : ""}
                        />
                        <ErrorText error={formErrors.email} />
                      </div>
                      <div className="space-y-2" data-error={!!formErrors.location}>
                        <Label>Location <span className="text-red-500">*</span></Label>
                        <PlacesAutocomplete
                          value={editData.location}
                          onChange={(val) => setField("location", val)}
                          onPlaceSelect={(place) => setField("location", place.address)}
                          placeholder="Search for address or area..."
                          error={!!formErrors.location}
                          countryRestrictions={["in"]}
                        />
                        <ErrorText error={formErrors.location} />
                      </div>
                    </div>
                    <div className="space-y-2" data-error={!!formErrors.source}>
                      <Label>Source <span className="text-red-500">*</span></Label>
                      <select
                        className={`${selectClass} ${formErrors.source ? "border-red-300" : ""}`}
                        value={editData.source}
                        onChange={(e) => {
                          setField("source", e.target.value)
                          if (e.target.value !== "Other") setField("source_other", "")
                        }}
                      >
                        <option value="" disabled>Select source</option>
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {editData.source === "Other" && (
                        <Input
                          placeholder="Specify source..."
                          value={editData.source_other}
                          onChange={(e) => setField("source_other", e.target.value)}
                          className={`mt-2 ${formErrors.source_other ? "border-red-300" : ""}`}
                          maxLength={MAX_OTHER_LENGTH}
                        />
                      )}
                      <ErrorText error={formErrors.source || formErrors.source_other} />
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
                          onChange={(e) => {
                            setField("property_type", e.target.value)
                            if (e.target.value !== "OTHER") setField("property_type_other", "")
                          }}
                        >
                          <option value="">Not specified</option>
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {editData.property_type === "OTHER" && (
                          <Input
                            placeholder="Specify property type..."
                            value={editData.property_type_other}
                            onChange={(e) => setField("property_type_other", e.target.value)}
                            className={`mt-1 ${formErrors.property_type_other ? "border-red-300" : ""}`}
                            maxLength={MAX_OTHER_LENGTH}
                          />
                        )}
                        <ErrorText error={formErrors.property_type_other} />
                      </div>
                      <div className="space-y-2">
                        <Label>Property Status</Label>
                        <select
                          className={selectClass}
                          value={editData.property_status}
                          onChange={(e) => {
                            setField("property_status", e.target.value)
                            if (e.target.value !== "OTHER") setField("property_status_other", "")
                          }}
                        >
                          <option value="">Not specified</option>
                          {PROPERTY_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        {editData.property_status === "OTHER" && (
                          <Input
                            placeholder="e.g. Partially furnished, Shell condition..."
                            value={editData.property_status_other}
                            onChange={(e) => setField("property_status_other", e.target.value)}
                            className={`mt-1 ${formErrors.property_status_other ? "border-red-300" : ""}`}
                            maxLength={MAX_OTHER_LENGTH}
                          />
                        )}
                        <ErrorText error={formErrors.property_status_other} />
                      </div>
                    </div>
                    <div className="space-y-2" data-error={!!formErrors.carpet_area}>
                      <Label>Carpet Area (sqft)</Label>
                      <Input
                        placeholder="e.g. 1200"
                        value={editData.carpet_area}
                        onChange={(e) => setField("carpet_area", filterDecimal(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key.length === 1 && !/[\d.]/.test(e.key)) e.preventDefault()
                        }}
                        inputMode="decimal"
                        className={formErrors.carpet_area ? "border-red-300" : ""}
                      />
                      <ErrorText error={formErrors.carpet_area} />
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
                                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                  : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted"
                              }`}
                            >
                              {selected && <span className="mr-1">&#10003;</span>}
                              {scope}
                            </button>
                          )
                        })}
                        {/* Other chip */}
                        <button
                          type="button"
                          onClick={() => toggleScope("Other")}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            editData.scope_of_work.includes("Other")
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-dashed border-input bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted"
                          }`}
                        >
                          {editData.scope_of_work.includes("Other") ? "\u2713 " : "+ "}
                          Other
                        </button>
                      </div>
                      {editData.scope_of_work.includes("Other") && (
                        <Input
                          placeholder="Specify other scope..."
                          value={editData.scope_other}
                          onChange={(e) => setField("scope_other", e.target.value)}
                          className={`mt-1 ${formErrors.scope_other ? "border-red-300" : ""}`}
                          maxLength={MAX_OTHER_LENGTH}
                        />
                      )}
                      <ErrorText error={formErrors.scope_other} />
                      {editData.scope_of_work.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {editData.scope_of_work.length} selected
                        </p>
                      )}
                    </div>
                    <FileUpload
                      value={editData.floor_plan_url || null}
                      onChange={(url) => setField("floor_plan_url", url || "")}
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
                          onChange={(e) => setField("budget_range", e.target.value)}
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
                          onChange={(e) => {
                            setField("design_style", e.target.value)
                            if (e.target.value !== "Other") setField("design_style_other", "")
                          }}
                        >
                          <option value="">Not specified</option>
                          {DESIGN_STYLES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {editData.design_style === "Other" && (
                          <Input
                            placeholder="Specify design style..."
                            value={editData.design_style_other}
                            onChange={(e) => setField("design_style_other", e.target.value)}
                            className={`mt-1 ${formErrors.design_style_other ? "border-red-300" : ""}`}
                            maxLength={MAX_OTHER_LENGTH}
                          />
                        )}
                        <ErrorText error={formErrors.design_style_other} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2" data-error={!!formErrors.possession_date}>
                        <Label>Possession Date</Label>
                        <Input
                          type="date"
                          value={editData.possession_date}
                          onChange={(e) => setField("possession_date", e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className={formErrors.possession_date ? "border-red-300" : ""}
                        />
                        <ErrorText error={formErrors.possession_date} />
                      </div>
                      <div className="space-y-2">
                        <Label>Site Visit Availability</Label>
                        <select
                          className={selectClass}
                          value={editData.site_visit_availability}
                          onChange={(e) => {
                            setField("site_visit_availability", e.target.value)
                            if (e.target.value !== "OTHER") setField("site_visit_other", "")
                          }}
                        >
                          <option value="">Not specified</option>
                          {SITE_VISIT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        {editData.site_visit_availability === "OTHER" && (
                          <Input
                            placeholder="e.g. Evenings after 6 PM..."
                            value={editData.site_visit_other}
                            onChange={(e) => setField("site_visit_other", e.target.value)}
                            className={`mt-1 ${formErrors.site_visit_other ? "border-red-300" : ""}`}
                            maxLength={MAX_OTHER_LENGTH}
                          />
                        )}
                        <ErrorText error={formErrors.site_visit_other} />
                      </div>
                    </div>
                    <div className="space-y-2" data-error={!!formErrors.notes}>
                      <Label>Notes</Label>
                      <textarea
                        className={`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${formErrors.notes ? "border-red-300" : ""}`}
                        placeholder="Notes about this lead..."
                        value={editData.notes}
                        onChange={(e) => setField("notes", e.target.value)}
                        maxLength={MAX_NOTES_LENGTH}
                      />
                      <div className="flex justify-between">
                        <ErrorText error={formErrors.notes} />
                        <span className={`text-xs ${editData.notes.length > MAX_NOTES_LENGTH * 0.9 ? "text-orange-500" : "text-muted-foreground"}`}>
                          {editData.notes.length}/{MAX_NOTES_LENGTH}
                        </span>
                      </div>
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
                        <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
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
                        : "\u2014"}
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

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <ActivityTab leadId={id} />
        )}

        {/* Convert to Client Dialog */}
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert Lead to Client?</DialogTitle>
              <DialogDescription>
                This will create a client account for {lead.name} and start a project from the approved quotation.
                {lead.email && (
                  <>
                    <br />
                    A login will be created with email: <strong>{lead.email}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Optional Project Location */}
            <div className="space-y-2 py-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Project Location <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <PlacesAutocomplete
                value={convertLocationAddress}
                onChange={setConvertLocationAddress}
                onPlaceSelect={(place) => {
                  if (place.lat != null && place.lng != null) {
                    setConvertLocationLat(place.lat)
                    setConvertLocationLng(place.lng)
                    setConvertLocationAddress(place.address)
                  }
                }}
                placeholder="Search project site address..."
                countryRestrictions={["in"]}
              />
              {convertLocationLat != null && convertLocationLng != null && (
                <p className="text-xs text-muted-foreground">
                  Coordinates: {convertLocationLat.toFixed(6)}, {convertLocationLng.toFixed(6)}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowConvertDialog(false)}
                disabled={convertMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                Convert &amp; Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

// ── Activity Tab Component ──

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: Phone, color: "bg-blue-100 text-blue-700" },
  { value: "EMAIL", label: "Email", icon: Mail, color: "bg-green-100 text-green-700" },
  { value: "MEETING", label: "Meeting", icon: Users, color: "bg-purple-100 text-purple-700" },
  { value: "NOTE", label: "Note", icon: FileText, color: "bg-yellow-100 text-yellow-700" },
  { value: "SITE_VISIT", label: "Site Visit", icon: MapPin, color: "bg-orange-100 text-orange-700" },
] as const

function getActivityMeta(type: string) {
  return ACTIVITY_TYPES.find((a) => a.value === type) ?? ACTIVITY_TYPES[3]
}

function ActivityTab({ leadId }: { leadId: string }) {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activityType, setActivityType] = useState("CALL")
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [activityDesc, setActivityDesc] = useState("")

  const { data: activities = [], isLoading } = useQuery<LeadActivity[]>({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const res = await api.get(`/crm/leads/${leadId}/activities`)
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: { type: string; description: string; date: string }) => {
      const res = await api.post(`/crm/leads/${leadId}/activities`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] })
      setDialogOpen(false)
      setActivityType("CALL")
      setActivityDate(new Date().toISOString().slice(0, 10))
      setActivityDesc("")
    },
  })

  const handleSubmit = () => {
    if (!activityDesc.trim()) return
    createMutation.mutate({
      type: activityType,
      description: activityDesc.trim(),
      date: activityDate,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Interaction History
        </h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Activity
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No activities logged yet.</p>
            <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Log First Activity
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-6">
          {activities.map((activity) => {
            const meta = getActivityMeta(activity.type)
            const Icon = meta.icon
            return (
              <div key={activity.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute -left-[calc(1.5rem+1px)] top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <Card>
                  <CardContent className="py-3 px-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={meta.color}>
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Activity Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className={selectClass}
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={activityDate}
                onChange={(e) => setActivityDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What happened? Key takeaways, next steps..."
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {activityDesc.length}/2000
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!activityDesc.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

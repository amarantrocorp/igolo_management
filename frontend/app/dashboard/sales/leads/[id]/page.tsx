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
  Trash2,
  CalendarClock,
  Upload,
  File,
  PhoneCall,
  StickyNote,
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
  { value: "FLAT", label: "Flat" },
  { value: "COMMERCIAL", label: "Commercial" },
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

function getStatusColor(status: string) {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-800"
    case "CONTACTED":
      return "bg-sky-100 text-sky-800"
    case "QUALIFIED":
      return "bg-indigo-100 text-indigo-800"
    case "QUOTATION_SENT":
      return "bg-amber-100 text-amber-800"
    case "NEGOTIATION":
      return "bg-orange-100 text-orange-800"
    case "CONVERTED":
      return "bg-emerald-100 text-emerald-800"
    case "LOST":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function getPriorityBadge(budget: string | undefined) {
  if (!budget) return { label: "Medium", color: "bg-yellow-100 text-yellow-800" }
  if (budget.includes("Above 1 Crore") || budget.includes("50 Lakhs")) {
    return { label: "High", color: "bg-orange-100 text-orange-800" }
  }
  if (budget.includes("20 - 50")) {
    return { label: "Medium", color: "bg-yellow-100 text-yellow-800" }
  }
  return { label: "Low", color: "bg-green-100 text-green-800" }
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

// ── Activity Constants ──

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: PhoneCall, color: "bg-blue-100 text-blue-700" },
  { value: "EMAIL", label: "Email", icon: Mail, color: "bg-green-100 text-green-700" },
  { value: "MEETING", label: "Meeting", icon: Users, color: "bg-purple-100 text-purple-700" },
  { value: "NOTE", label: "Note", icon: StickyNote, color: "bg-yellow-100 text-yellow-700" },
  { value: "SITE_VISIT", label: "Site Visit", icon: MapPin, color: "bg-orange-100 text-orange-700" },
] as const

function getActivityMeta(type: string) {
  return ACTIVITY_TYPES.find((a) => a.value === type) ?? ACTIVITY_TYPES[3]
}

// ── Page Component ──

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const userRole = useAuthStore((s) => s.user?.role)
  const canManageQuotes = userRole !== "BDE"

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

  // Activity dialog state
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [activityType, setActivityType] = useState("NOTE")
  const [activityDate, setActivityDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [activityDesc, setActivityDesc] = useState("")

  // Convert dialog state
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [convertLocationAddress, setConvertLocationAddress] = useState("")
  const [convertLocationLat, setConvertLocationLat] = useState<number | null>(null)
  const [convertLocationLng, setConvertLocationLng] = useState<number | null>(null)

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // ── Queries ──

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

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<LeadActivity[]>({
    queryKey: ["lead-activities", id],
    queryFn: async () => {
      const res = await api.get(`/crm/leads/${id}/activities`)
      return res.data
    },
    enabled: !!id,
  })

  // ── Mutations ──

  const updateMutation = useMutation({
    mutationFn: async (data: EditFormData) => {
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
      toast({ title: "Updated", description: "Lead details saved successfully" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead", variant: "destructive" })
    },
  })

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

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/crm/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      toast({ title: "Deleted", description: "Lead has been removed" })
      router.push("/dashboard/sales/leads")
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" })
    },
  })

  const activityMutation = useMutation({
    mutationFn: async (payload: { type: string; description: string; date: string }) => {
      const res = await api.post(`/crm/leads/${id}/activities`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", id] })
      setActivityDialogOpen(false)
      setActivityType("NOTE")
      setActivityDate(new Date().toISOString().slice(0, 10))
      setActivityDesc("")
      toast({ title: "Logged", description: "Activity recorded" })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log activity", variant: "destructive" })
    },
  })

  const canConvert = lead && lead.status !== "CONVERTED"
    && quotations.some((q) => q.status === "APPROVED")
    && (userRole === "MANAGER" || userRole === "SUPER_ADMIN")

  const convertMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/crm/leads/${id}/convert`)
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

  // ── Edit Handlers ──

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
  const priority = getPriorityBadge(lead?.budget_range)

  // ── Loading / Error States ──

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

  // ── Render ──

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-6">

        {/* ────────────────────────────────────────── */}
        {/* HEADER SECTION                            */}
        {/* ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Back + Name + Info */}
          <div className="flex items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0"
              onClick={() => router.push("/dashboard/sales/leads")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
                <Badge className={getStatusColor(lead.status)}>
                  {lead.status.replace(/_/g, " ")}
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
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs font-medium"
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
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {lead.contact_number && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {lead.contact_number}
                  </span>
                )}
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {lead.email}
                  </span>
                )}
                {lead.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {lead.location}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {editMode ? (
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
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                {!isConverted && (
                  <Button variant="outline" size="sm" onClick={enterEditMode}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Lead
                  </Button>
                )}
                {!isConverted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/sales/leads/${lead.id}/follow-ups`)}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Schedule Follow-up
                  </Button>
                )}
                {canConvert && (
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={() => {
                      setConvertLocationAddress(lead?.location || "")
                      setConvertLocationLat(null)
                      setConvertLocationLng(null)
                      setShowConvertDialog(true)
                    }}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Convert to Project
                  </Button>
                )}
                {isConverted && (
                  <Button size="sm" disabled variant="outline">
                    <Lock className="mr-2 h-4 w-4" />
                    Converted
                  </Button>
                )}
                {!isConverted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
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

        {/* ────────────────────────────────────────── */}
        {/* TWO-COLUMN LAYOUT                         */}
        {/* ────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">

            {/* Client Information Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Client Information</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <div className="space-y-4">
                    {/* Name */}
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
                    {/* Phone */}
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
                    {/* Email */}
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
                    {/* Location */}
                    <div className="space-y-2" data-error={!!formErrors.location}>
                      <Label>Project Location <span className="text-red-500">*</span></Label>
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
                    {/* Property Type */}
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
                    {/* Carpet Area */}
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
                    {/* Budget */}
                    <div className="space-y-2">
                      <Label>Expected Budget</Label>
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
                    {/* Source */}
                    <div className="space-y-2" data-error={!!formErrors.source}>
                      <Label>Lead Source <span className="text-red-500">*</span></Label>
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
                    {/* Property Status */}
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
                    {/* Design Style */}
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
                    {/* Possession Date */}
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
                    {/* Site Visit */}
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
                    {/* Scope of Work */}
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
                    {/* Floor Plan Upload */}
                    <FileUpload
                      value={editData.floor_plan_url || null}
                      onChange={(url) => setField("floor_plan_url", url || "")}
                      category="leads"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      maxSizeMB={25}
                      label="Floor Plan"
                    />
                    {/* Notes */}
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InfoRow label="Full Name" value={lead.name} />
                    <InfoRow label="Phone" value={lead.contact_number} icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />} />
                    {lead.email && <InfoRow label="Email" value={lead.email} icon={<Mail className="h-3.5 w-3.5 text-muted-foreground" />} />}
                    <InfoRow label="Project Location" value={lead.location || "Not specified"} icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />} />

                    <div className="border-t my-3" />

                    <InfoRow
                      label="Property Type"
                      value={lead.property_type ? formatLabel(lead.property_type) : "Not specified"}
                      icon={<Building2 className="h-3.5 w-3.5 text-muted-foreground" />}
                    />
                    <InfoRow
                      label="Area"
                      value={lead.carpet_area ? `${lead.carpet_area} sqft` : "Not specified"}
                      icon={<Ruler className="h-3.5 w-3.5 text-muted-foreground" />}
                    />
                    <InfoRow
                      label="Expected Budget"
                      value={lead.budget_range || "Not specified"}
                      icon={<Wallet className="h-3.5 w-3.5 text-muted-foreground" />}
                    />
                    <InfoRow
                      label="Lead Source"
                      value={lead.source}
                    />

                    <div className="border-t my-3" />

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assigned To</span>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">
                          {lead.assigned_to?.full_name ?? "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Priority</span>
                      <Badge className={`${priority.color} text-xs font-medium`}>
                        {priority.label}
                      </Badge>
                    </div>

                    {lead.design_style && (
                      <InfoRow label="Design Style" value={lead.design_style} icon={<Paintbrush className="h-3.5 w-3.5 text-muted-foreground" />} />
                    )}
                    {lead.possession_date && (
                      <InfoRow
                        label="Possession"
                        value={new Date(lead.possession_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
                      />
                    )}
                    {lead.site_visit_availability && (
                      <InfoRow
                        label="Site Visit"
                        value={formatLabel(lead.site_visit_availability)}
                        icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                      />
                    )}
                    {lead.property_status && (
                      <InfoRow label="Property Status" value={formatLabel(lead.property_status)} />
                    )}

                    {lead.scope_of_work && lead.scope_of_work.length > 0 && (
                      <div className="pt-1">
                        <p className="text-sm text-muted-foreground mb-2">Scope of Work</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.scope_of_work.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {lead.notes && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">NOTES</p>
                        <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
                      </div>
                    )}

                    {lead.floor_plan_url && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-2">FLOOR PLAN</p>
                        {/\.(jpg|jpeg|png|webp|gif)$/i.test(lead.floor_plan_url) ? (
                          <a href={lead.floor_plan_url} target="_blank" rel="noopener noreferrer">
                            <img
                              src={lead.floor_plan_url}
                              alt="Floor Plan"
                              className="max-h-32 rounded-md border object-contain"
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attachments Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                {!lead.floor_plan_url && (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop files here, or click Edit Lead to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG up to 25MB
                    </p>
                  </div>
                )}
                {lead.floor_plan_url && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-md border bg-muted/30">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-100">
                        <File className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Floor Plan</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(lead.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <a
                        href={lead.floor_plan_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quotations Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Quotations</CardTitle>
                  {canManageQuotes && !isConverted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => router.push(`/dashboard/sales/quotes/new?lead_id=${lead.id}`)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      New Quote
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {quotations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No quotations yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {quotations.map((quote) => (
                      <div
                        key={quote.id}
                        className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/dashboard/sales/quotes/${quote.id}`)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                            v{quote.version}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              QT-{quote.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(quote.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit", month: "short",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatINR(Number(quote.total_amount))}
                          </p>
                          <Badge variant={getStatusBadgeVariant(quote.status)} className="text-[10px]">
                            {quote.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-6">

            {/* Follow-ups Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Follow-ups</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => router.push(`/dashboard/sales/leads/${lead.id}/follow-ups`)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Follow-up
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Follow-ups data would come from API - showing activity-based follow-ups */}
                {activities.filter((a) => a.type === "CALL" || a.type === "MEETING" || a.type === "SITE_VISIT").length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CalendarClock className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No follow-ups scheduled</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 text-xs"
                      onClick={() => router.push(`/dashboard/sales/leads/${lead.id}/follow-ups`)}
                    >
                      Schedule First Follow-up
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Date</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Type</th>
                          <th className="pb-2 pr-4 font-medium text-muted-foreground text-xs">Notes</th>
                          <th className="pb-2 font-medium text-muted-foreground text-xs">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activities
                          .filter((a) => a.type === "CALL" || a.type === "MEETING" || a.type === "SITE_VISIT")
                          .slice(0, 5)
                          .map((activity) => {
                            const meta = getActivityMeta(activity.type)
                            return (
                              <tr key={activity.id} className="border-b last:border-0">
                                <td className="py-2.5 pr-4 whitespace-nowrap text-xs">
                                  {new Date(activity.date).toLocaleDateString("en-IN", {
                                    day: "2-digit", month: "short", year: "numeric",
                                  })}
                                </td>
                                <td className="py-2.5 pr-4">
                                  <Badge variant="outline" className={`${meta.color} text-[10px]`}>
                                    {meta.label}
                                  </Badge>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {activity.description}
                                  </p>
                                </td>
                                <td className="py-2.5">
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">
                                    Completed
                                  </Badge>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setActivityType("NOTE")
                        setActivityDialogOpen(true)
                      }}
                    >
                      <StickyNote className="mr-1 h-3.5 w-3.5" />
                      Add Note
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setActivityType("CALL")
                        setActivityDialogOpen(true)
                      }}
                    >
                      <PhoneCall className="mr-1 h-3.5 w-3.5" />
                      Log Call
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setActivityType("MEETING")
                        setActivityDialogOpen(true)
                      }}
                    >
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      Add Meeting
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activitiesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No activities logged yet</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActivityDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Log First Activity
                    </Button>
                  </div>
                ) : (
                  <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-5">
                    {activities.map((activity) => {
                      const meta = getActivityMeta(activity.type)
                      const Icon = meta.icon
                      return (
                        <div key={activity.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute -left-[calc(1.5rem+1px)] top-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                  {activity.type === "NOTE" && "Notes Added"}
                                  {activity.type === "CALL" && "Call Logged"}
                                  {activity.type === "EMAIL" && "Email Sent"}
                                  {activity.type === "MEETING" && "Meeting Logged"}
                                  {activity.type === "SITE_VISIT" && "Site Visit"}
                                </p>
                                <Badge variant="outline" className={`${meta.color} text-[10px]`}>
                                  {meta.label}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {activity.description}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              {new Date(activity.date).toLocaleDateString("en-IN", {
                                day: "2-digit", month: "short", year: "numeric",
                              })}
                              {" "}
                              {new Date(activity.created_at).toLocaleTimeString("en-IN", {
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ────────────────────────────────────────── */}
        {/* DIALOGS                                   */}
        {/* ────────────────────────────────────────── */}

        {/* Activity Dialog */}
        <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
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
                onClick={() => setActivityDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!activityDesc.trim()) return
                  activityMutation.mutate({
                    type: activityType,
                    description: activityDesc.trim(),
                    date: activityDate,
                  })
                }}
                disabled={!activityDesc.trim() || activityMutation.isPending}
              >
                {activityMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Convert to Client Dialog */}
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convert Lead to Project</DialogTitle>
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
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
              >
                {convertMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                Convert & Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Lead</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{lead.name}</strong>? This action cannot be undone. All associated activities will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

// ── Helper: Info Row for read-only display ──

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium">{value}</span>
      </div>
    </div>
  )
}

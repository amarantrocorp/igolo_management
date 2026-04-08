"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FileUpload } from "@/components/ui/file-upload"
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete"
import {
  ArrowLeft,
  Loader2,
  User as UserIcon,
  Phone,
  Mail,
  Building2,
  MapPin,
  Home,
  Ruler,
  IndianRupee,
  Palette,
  CalendarDays,
  Globe,
  UserPlus,
  AlertCircle,
  FileText,
  Star,
  MessageSquare,
  CheckCircle2,
} from "lucide-react"

// ── Constants ──

const LEAD_SOURCES = [
  { value: "Website", icon: Globe },
  { value: "Referral", icon: UserPlus },
  { value: "Instagram", icon: Globe },
  { value: "Facebook", icon: Globe },
  { value: "Google Ads", icon: Globe },
  { value: "Walk-in", icon: Home },
  { value: "Real Estate Partner", icon: Building2 },
  { value: "Just Dial", icon: Phone },
  { value: "Housing.com", icon: Home },
  { value: "Other", icon: Globe },
]

const PROPERTY_TYPES = [
  { value: "FLAT", label: "Flat" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "INDEPENDENT_HOUSE", label: "Independent House" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "STUDIO", label: "Studio" },
  { value: "OFFICE", label: "Office" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "RETAIL", label: "Retail" },
  { value: "OTHER", label: "Other" },
]

const BHK_OPTIONS = ["1 BHK", "1.5 BHK", "2 BHK", "2.5 BHK", "3 BHK", "3.5 BHK", "4 BHK", "4+ BHK", "Other"]

const PROPERTY_STATUSES = [
  { value: "UNDER_CONSTRUCTION", label: "Under Construction" },
  { value: "READY_TO_MOVE", label: "Ready to Move" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "RENOVATION", label: "Renovation" },
  { value: "OTHER", label: "Other" },
]

const SCOPE_OPTIONS = [
  "Full Home Interior",
  "Kitchen",
  "Living Room",
  "Bedroom(s)",
  "Bathroom(s)",
  "False Ceiling",
  "Painting",
  "Electrical",
  "Flooring",
  "Furniture Only",
  "Modular Kitchen",
  "Wardrobe",
  "TV Unit",
  "Study Room",
  "Pooja Room",
]

const DESIGN_STYLES = [
  "Modern",
  "Contemporary",
  "Minimalist",
  "Traditional",
  "Industrial",
  "Scandinavian",
  "Bohemian",
  "Luxury",
  "Transitional",
  "Other",
]

const BUDGET_RANGES = [
  "Under 5 Lakhs",
  "5 - 10 Lakhs",
  "10 - 20 Lakhs",
  "20 - 50 Lakhs",
  "50 Lakhs - 1 Crore",
  "Above 1 Crore",
]

const SITE_VISIT_OPTIONS = [
  { value: "WEEKDAYS", label: "Weekdays" },
  { value: "WEEKENDS", label: "Weekends" },
  { value: "ANYTIME", label: "Anytime" },
  { value: "NOT_AVAILABLE", label: "Not Available" },
  { value: "OTHER", label: "Other" },
]

const PRIORITY_LEVELS = [
  { value: "LOW", label: "Low", color: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "HIGH", label: "High", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "URGENT", label: "Urgent", color: "bg-red-50 text-red-700 border-red-200" },
]

const TIMELINE_OPTIONS = [
  "Immediately",
  "Within 1 Month",
  "1-3 Months",
  "3-6 Months",
  "6+ Months",
  "Not Decided",
]

// ── Form State ──

const INITIAL_FORM = {
  // Client Information
  name: "",
  contact_number: "",
  alternate_phone: "",
  email: "",
  company_name: "",

  // Project Information
  location: "",
  property_type: "",
  property_type_other: "",
  bhk_config: "",
  bhk_config_other: "",
  property_status: "",
  property_status_other: "",
  carpet_area: "",
  floor_number: "",

  // Scope & Budget
  scope_of_work: [] as string[],
  scope_other: "",
  budget_range: "",
  design_style: "",
  design_style_other: "",
  timeline: "",

  // Lead Source & Assignment
  source: "",
  source_other: "",
  referral_name: "",
  assigned_to_id: "",
  priority: "MEDIUM",

  // Additional Details
  possession_date: "",
  move_in_date: "",
  site_visit_availability: "",
  site_visit_other: "",
  notes: "",
  special_requirements: "",
  floor_plan_url: "",
  // Categorized uploads: each category holds an array of URLs
  uploads: {
    floor_plan: [] as string[],
    reference_images: [] as string[],
    site_photos: [] as string[],
    documents: [] as string[],
  },
}

// ── Input Filters (prevent invalid chars at keystroke level) ──

/** Only digits, +, spaces, hyphens, parens — strips everything else */
function filterPhone(value: string): string {
  return value.replace(/[^\d+\s\-()]/g, "")
}

/** Only letters, spaces, hyphens, apostrophes, periods */
function filterName(value: string): string {
  return value.replace(/[^a-zA-Z\s.'\-]/g, "")
}

/** Only digits (whole numbers) */
function filterInteger(value: string): string {
  return value.replace(/[^\d]/g, "")
}

/** Only digits and a single decimal point */
function filterDecimal(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "")
  // Allow only one decimal point
  const parts = cleaned.split(".")
  if (parts.length > 2) return parts[0] + "." + parts.slice(1).join("")
  return cleaned
}

// ── Validation ──

const MAX_NAME_LENGTH = 100
const MAX_COMPANY_LENGTH = 150
const MAX_NOTES_LENGTH = 1000
const MAX_SPECIAL_REQ_LENGTH = 500
const MAX_OTHER_LENGTH = 100
const MAX_CARPET_AREA = 50000
const MAX_FLOOR = 200

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "")
  return /^(\+91|91)?[6-9]\d{9}$/.test(cleaned) || /^\+?[\d]{7,15}$/.test(cleaned)
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateName(name: string): boolean {
  return /^[a-zA-Z\s.''\-]+$/.test(name)
}

type FormErrors = Partial<Record<keyof typeof INITIAL_FORM, string>>

function validateForm(data: typeof INITIAL_FORM): { valid: boolean; errors: FormErrors } {
  const errors: FormErrors = {}

  // ── Client Information ──

  if (!data.name.trim()) {
    errors.name = "Full name is required"
  } else if (data.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters"
  } else if (data.name.trim().length > MAX_NAME_LENGTH) {
    errors.name = `Name must be under ${MAX_NAME_LENGTH} characters`
  } else if (!validateName(data.name.trim())) {
    errors.name = "Name can only contain letters, spaces, hyphens, and apostrophes"
  }

  if (!data.contact_number.trim()) {
    errors.contact_number = "Phone number is required"
  } else if (!validatePhone(data.contact_number)) {
    errors.contact_number = "Enter a valid Indian mobile or international number"
  }

  if (data.alternate_phone.trim()) {
    if (!validatePhone(data.alternate_phone)) {
      errors.alternate_phone = "Enter a valid phone number"
    } else if (data.alternate_phone.replace(/[\s\-\(\)]/g, "") === data.contact_number.replace(/[\s\-\(\)]/g, "")) {
      errors.alternate_phone = "Alternate phone must be different from primary"
    }
  }

  if (data.email.trim()) {
    if (!validateEmail(data.email)) {
      errors.email = "Enter a valid email address (e.g. name@domain.com)"
    }
  }

  if (data.company_name.trim().length > MAX_COMPANY_LENGTH) {
    errors.company_name = `Company name must be under ${MAX_COMPANY_LENGTH} characters`
  }

  // ── Project Information ──

  if (!data.location.trim()) {
    errors.location = "Project location is required"
  } else if (data.location.trim().length < 5) {
    errors.location = "Please enter a more specific location (min 5 characters)"
  }

  if (data.property_type === "OTHER" && !data.property_type_other.trim()) {
    errors.property_type_other = "Please specify the property type"
  } else if (data.property_type === "OTHER" && data.property_type_other.trim().length > MAX_OTHER_LENGTH) {
    errors.property_type_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  if (data.bhk_config === "Other" && !data.bhk_config_other.trim()) {
    errors.bhk_config_other = "Please specify the configuration"
  } else if (data.bhk_config === "Other" && data.bhk_config_other.trim().length > MAX_OTHER_LENGTH) {
    errors.bhk_config_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  if (data.property_status === "OTHER" && !data.property_status_other.trim()) {
    errors.property_status_other = "Please specify the property status"
  } else if (data.property_status === "OTHER" && data.property_status_other.trim().length > MAX_OTHER_LENGTH) {
    errors.property_status_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  if (data.carpet_area.trim()) {
    const area = Number(data.carpet_area)
    if (isNaN(area) || area <= 0) {
      errors.carpet_area = "Enter a valid area in sqft"
    } else if (area < 50) {
      errors.carpet_area = "Area seems too small (min 50 sqft)"
    } else if (area > MAX_CARPET_AREA) {
      errors.carpet_area = `Area seems too large (max ${MAX_CARPET_AREA.toLocaleString()} sqft)`
    }
  }

  if (data.floor_number.trim()) {
    const floor = Number(data.floor_number)
    if (isNaN(floor) || !Number.isInteger(floor)) {
      errors.floor_number = "Enter a whole number"
    } else if (floor < 0) {
      errors.floor_number = "Floor number cannot be negative"
    } else if (floor > MAX_FLOOR) {
      errors.floor_number = `Floor number seems too high (max ${MAX_FLOOR})`
    }
  }

  // ── Scope & Budget ──

  if (data.scope_of_work.includes("Other") && !data.scope_other.trim()) {
    errors.scope_other = "Please specify the scope of work"
  } else if (data.scope_other.trim().length > MAX_OTHER_LENGTH) {
    errors.scope_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  if (data.design_style === "Other" && !data.design_style_other.trim()) {
    errors.design_style_other = "Please specify the design style"
  } else if (data.design_style === "Other" && data.design_style_other.trim().length > MAX_OTHER_LENGTH) {
    errors.design_style_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  // ── Lead Source ──

  if (!data.source) {
    errors.source = "Lead source is required"
  } else if (data.source === "Other" && !data.source_other.trim()) {
    errors.source_other = "Please specify the source"
  } else if (data.source === "Other" && data.source_other.trim().length > MAX_OTHER_LENGTH) {
    errors.source_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  if (data.source === "Referral" && !data.referral_name.trim()) {
    errors.referral_name = "Referral name is required when source is Referral"
  }

  // ── Scheduling ──

  if (data.possession_date) {
    const possDate = new Date(data.possession_date)
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 10)
    if (possDate > maxDate) {
      errors.possession_date = "Possession date seems too far in the future"
    }
  }

  if (data.site_visit_availability === "OTHER" && !data.site_visit_other.trim()) {
    errors.site_visit_other = "Please specify your availability"
  } else if (data.site_visit_other.trim().length > MAX_OTHER_LENGTH) {
    errors.site_visit_other = `Must be under ${MAX_OTHER_LENGTH} characters`
  }

  // ── Notes ──

  if (data.notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Notes must be under ${MAX_NOTES_LENGTH} characters`
  }

  if (data.special_requirements.length > MAX_SPECIAL_REQ_LENGTH) {
    errors.special_requirements = `Special requirements must be under ${MAX_SPECIAL_REQ_LENGTH} characters`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// ── Select Component ──

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"

function FormField({
  label,
  required,
  error,
  children,
  className = "",
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Page Component ──

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function CreateLeadPage() {
  const router = useRouter()
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)

  // Fetch team members for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users-for-assignment"],
    queryFn: async () => {
      const response = await api.get("/users")
      const all = response.data.items ?? response.data
      return all.filter((u: User) => ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"].includes(u.role ?? ""))
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof INITIAL_FORM) => {
      // Resolve "Other" custom values
      const resolvedSource =
        data.source === "Other" && data.source_other.trim()
          ? data.source_other.trim()
          : data.source === "Referral" && data.referral_name.trim()
          ? `Referral - ${data.referral_name.trim()}`
          : data.source
      const resolvedDesignStyle =
        data.design_style === "Other" && data.design_style_other.trim()
          ? data.design_style_other.trim()
          : data.design_style

      // Build scope list, appending custom "Other" entry if provided
      const resolvedScope = [...data.scope_of_work]
      if (data.scope_of_work.includes("Other") && data.scope_other.trim()) {
        // Replace the generic "Other" with the specific value
        const idx = resolvedScope.indexOf("Other")
        if (idx !== -1) resolvedScope[idx] = data.scope_other.trim()
      }

      const payload: Record<string, unknown> = {
        name: data.name.trim(),
        contact_number: data.contact_number.trim(),
        source: resolvedSource,
        location: data.location.trim(),
      }
      if (data.email) payload.email = data.email.trim()
      if (data.notes) payload.notes = data.notes.trim()
      if (data.special_requirements) {
        payload.notes = payload.notes
          ? `${payload.notes}\n\nSpecial Requirements: ${data.special_requirements.trim()}`
          : `Special Requirements: ${data.special_requirements.trim()}`
      }
      if (data.alternate_phone) {
        payload.notes = payload.notes
          ? `${payload.notes}\nAlternate Phone: ${data.alternate_phone.trim()}`
          : `Alternate Phone: ${data.alternate_phone.trim()}`
      }
      if (data.company_name) {
        payload.notes = payload.notes
          ? `${payload.notes}\nCompany: ${data.company_name.trim()}`
          : `Company: ${data.company_name.trim()}`
      }
      if (data.property_type === "OTHER" && data.property_type_other.trim()) {
        payload.property_type = "OTHER"
        payload.notes = payload.notes
          ? `${payload.notes}\nProperty Type: ${data.property_type_other.trim()}`
          : `Property Type: ${data.property_type_other.trim()}`
      } else if (data.property_type) {
        payload.property_type = data.property_type
      }
      // BHK config - resolve "Other"
      const resolvedBhk = data.bhk_config === "Other" && data.bhk_config_other.trim()
        ? data.bhk_config_other.trim()
        : data.bhk_config
      if (resolvedBhk && resolvedBhk !== "Other") {
        payload.notes = payload.notes
          ? `${payload.notes}\nBHK Config: ${resolvedBhk}`
          : `BHK Config: ${resolvedBhk}`
      }
      // Property status - resolve "OTHER"
      if (data.property_status === "OTHER" && data.property_status_other.trim()) {
        payload.property_status = "OTHER"
        payload.notes = payload.notes
          ? `${payload.notes}\nProperty Status: ${data.property_status_other.trim()}`
          : `Property Status: ${data.property_status_other.trim()}`
      } else if (data.property_status) {
        payload.property_status = data.property_status
      }
      // Site visit - resolve "OTHER"
      if (data.site_visit_availability === "OTHER" && data.site_visit_other.trim()) {
        payload.site_visit_availability = data.site_visit_other.trim()
      } else if (data.site_visit_availability) {
        payload.site_visit_availability = data.site_visit_availability
      }
      if (data.carpet_area) payload.carpet_area = Number(data.carpet_area)
      if (resolvedScope.length > 0) payload.scope_of_work = resolvedScope
      // Use first floor plan as the primary floor_plan_url for backward compat
      if (data.uploads.floor_plan.length > 0) {
        payload.floor_plan_url = data.uploads.floor_plan[0]
      } else if (data.floor_plan_url) {
        payload.floor_plan_url = data.floor_plan_url
      }

      // Append categorized uploads info to notes
      const allUploads = Object.entries(data.uploads).filter(([, urls]) => (urls as string[]).length > 0)
      if (allUploads.length > 0) {
        const uploadNotes = allUploads.map(([cat, urls]) =>
          `${cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}: ${(urls as string[]).length} file(s)`
        ).join("\n")
        payload.notes = payload.notes
          ? `${payload.notes}\n\n--- Attachments ---\n${uploadNotes}`
          : `--- Attachments ---\n${uploadNotes}`
      }
      if (data.budget_range) payload.budget_range = data.budget_range
      if (resolvedDesignStyle) payload.design_style = resolvedDesignStyle
      if (data.possession_date) payload.possession_date = data.possession_date
      if (data.assigned_to_id) payload.assigned_to_id = data.assigned_to_id

      const response = await api.post("/crm/leads", payload)
      return response.data
    },
    onSuccess: () => {
      router.push("/dashboard/sales/leads")
    },
  })

  const update = useCallback(
    <K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }))
      if (formErrors[key]) {
        setFormErrors((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }
    },
    [formErrors]
  )

  const toggleScope = useCallback((scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scope_of_work: prev.scope_of_work.includes(scope)
        ? prev.scope_of_work.filter((s) => s !== scope)
        : [...prev.scope_of_work, scope],
    }))
  }, [])

  const handleSubmit = useCallback(() => {
    setSubmitted(true)
    const { valid, errors } = validateForm(formData)
    setFormErrors(errors)
    if (!valid) {
      // Scroll to first error
      setTimeout(() => {
        const firstErr = document.querySelector("[data-error='true']")
        firstErr?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 50)
      return
    }
    createMutation.mutate(formData)
  }, [formData, createMutation])

  const hasErrors = submitted && Object.keys(formErrors).length > 0

  // Count filled optional sections for progress
  const completionCount = useMemo(() => {
    let count = 0
    if (formData.name) count++
    if (formData.contact_number) count++
    if (formData.source) count++
    if (formData.location) count++
    if (formData.property_type) count++
    if (formData.budget_range) count++
    if (formData.scope_of_work.length > 0) count++
    if (formData.email) count++
    return count
  }, [formData])

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="mx-auto max-w-4xl pb-12">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 mb-6 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard/sales/leads")}
                className="h-9 w-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Create New Lead</h1>
                <p className="text-sm text-muted-foreground">
                  Add a new prospective client to the pipeline
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/sales/leads")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="min-w-[120px]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save Lead
              </Button>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min((completionCount / 8) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completionCount}/8 fields</span>
          </div>
        </div>

        {/* Error Banner */}
        {hasErrors && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Please fix the highlighted errors below before saving.
          </div>
        )}

        {createMutation.isError && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Failed to create lead. Please try again.
          </div>
        )}

        <div className="space-y-6">
          {/* ── Section 1: Client Information ── */}
          <SectionCard icon={UserIcon} title="Client Information">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Full Name" required error={formErrors.name}>
                <div className="relative" data-error={!!formErrors.name}>
                  <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => update("name", filterName(e.target.value))}
                    className={`pl-10 ${formErrors.name ? "border-red-300 focus:ring-red-500" : ""}`}
                    maxLength={MAX_NAME_LENGTH}
                  />
                </div>
              </FormField>

              <FormField label="Phone Number" required error={formErrors.contact_number}>
                <div className="relative" data-error={!!formErrors.contact_number}>
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="+91 98765 43210"
                    value={formData.contact_number}
                    onChange={(e) => update("contact_number", filterPhone(e.target.value))}
                    onKeyDown={(e) => {
                      // Allow control keys but block letters
                      if (e.key.length === 1 && !/[\d+\s\-()]/.test(e.key)) e.preventDefault()
                    }}
                    maxLength={20}
                    className={`pl-10 ${formErrors.contact_number ? "border-red-300 focus:ring-red-500" : ""}`}
                    inputMode="tel"
                  />
                </div>
              </FormField>

              <FormField label="Alternate Phone" error={formErrors.alternate_phone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="+91 98765 43210"
                    value={formData.alternate_phone}
                    onChange={(e) => update("alternate_phone", filterPhone(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 && !/[\d+\s\-()]/.test(e.key)) e.preventDefault()
                    }}
                    maxLength={20}
                    className={`pl-10 ${formErrors.alternate_phone ? "border-red-300 focus:ring-red-500" : ""}`}
                    inputMode="tel"
                  />
                </div>
              </FormField>

              <FormField label="Email Address" error={formErrors.email}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => update("email", e.target.value)}
                    className={`pl-10 ${formErrors.email ? "border-red-300 focus:ring-red-500" : ""}`}
                  />
                </div>
              </FormField>

              <FormField label="Company Name" error={formErrors.company_name} className="sm:col-span-2">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Company Inc. (Optional)"
                    value={formData.company_name}
                    onChange={(e) => update("company_name", e.target.value)}
                    className={`pl-10 ${formErrors.company_name ? "border-red-300 focus:ring-red-500" : ""}`}
                    maxLength={MAX_COMPANY_LENGTH}
                  />
                </div>
              </FormField>
            </div>
          </SectionCard>

          {/* ── Section 2: Project Information ── */}
          <SectionCard icon={Home} title="Project Information">
            <div className="space-y-5">
              <FormField label="Project Location" required error={formErrors.location}>
                <div data-error={!!formErrors.location}>
                  <PlacesAutocomplete
                    value={formData.location}
                    onChange={(val) => update("location", val)}
                    onPlaceSelect={(place) => {
                      update("location", place.address)
                    }}
                    placeholder="Search for address, area, or landmark..."
                    error={!!formErrors.location}
                    countryRestrictions={["in"]}
                  />
                </div>
              </FormField>

              <div className="grid gap-5 sm:grid-cols-3">
                <FormField label="Property Type" error={formErrors.property_type_other}>
                  <select
                    className={selectClass}
                    value={formData.property_type}
                    onChange={(e) => {
                      update("property_type", e.target.value)
                      if (e.target.value !== "OTHER") update("property_type_other", "")
                    }}
                  >
                    <option value="">Select type</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  {formData.property_type === "OTHER" && (
                    <Input
                      placeholder="Specify property type..."
                      value={formData.property_type_other}
                      onChange={(e) => update("property_type_other", e.target.value)}
                      className={`mt-2 ${formErrors.property_type_other ? "border-red-300 focus:ring-red-500" : ""}`}
                    />
                  )}
                </FormField>

                <FormField label="BHK Configuration" error={formErrors.bhk_config_other}>
                  <select
                    className={selectClass}
                    value={formData.bhk_config}
                    onChange={(e) => {
                      update("bhk_config", e.target.value)
                      if (e.target.value !== "Other") update("bhk_config_other", "")
                    }}
                  >
                    <option value="">Select BHK</option>
                    {BHK_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  {formData.bhk_config === "Other" && (
                    <Input
                      placeholder="e.g. Open layout, Duplex, etc."
                      value={formData.bhk_config_other}
                      onChange={(e) => update("bhk_config_other", e.target.value)}
                      className={`mt-2 ${formErrors.bhk_config_other ? "border-red-300 focus:ring-red-500" : ""}`}
                      maxLength={MAX_OTHER_LENGTH}
                    />
                  )}
                </FormField>

                <FormField label="Property Status" error={formErrors.property_status_other}>
                  <select
                    className={selectClass}
                    value={formData.property_status}
                    onChange={(e) => {
                      update("property_status", e.target.value)
                      if (e.target.value !== "OTHER") update("property_status_other", "")
                    }}
                  >
                    <option value="">Select status</option>
                    {PROPERTY_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  {formData.property_status === "OTHER" && (
                    <Input
                      placeholder="e.g. Partially furnished, Shell condition..."
                      value={formData.property_status_other}
                      onChange={(e) => update("property_status_other", e.target.value)}
                      className={`mt-2 ${formErrors.property_status_other ? "border-red-300 focus:ring-red-500" : ""}`}
                      maxLength={MAX_OTHER_LENGTH}
                    />
                  )}
                </FormField>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Approx. Area (sqft)" error={formErrors.carpet_area}>
                  <div className="relative">
                    <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="e.g. 1200"
                      value={formData.carpet_area}
                      onChange={(e) => update("carpet_area", filterDecimal(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key.length === 1 && !/[\d.]/.test(e.key)) e.preventDefault()
                      }}
                      className={`pl-10 ${formErrors.carpet_area ? "border-red-300 focus:ring-red-500" : ""}`}
                      inputMode="decimal"
                    />
                  </div>
                </FormField>

                <FormField label="Floor Number" error={formErrors.floor_number}>
                  <Input
                    placeholder="e.g. 5"
                    value={formData.floor_number}
                    onChange={(e) => update("floor_number", filterInteger(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault()
                    }}
                    className={formErrors.floor_number ? "border-red-300 focus:ring-red-500" : ""}
                    inputMode="numeric"
                  />
                </FormField>
              </div>
            </div>
          </SectionCard>

          {/* ── Section 3: Scope & Budget ── */}
          <SectionCard icon={Palette} title="Scope & Budget">
            <div className="space-y-5">
              <FormField label="Scope of Work">
                <div className="flex flex-wrap gap-2">
                  {SCOPE_OPTIONS.map((scope) => {
                    const selected = formData.scope_of_work.includes(scope)
                    return (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => toggleScope(scope)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
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
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      formData.scope_of_work.includes("Other")
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-dashed border-input bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted"
                    }`}
                  >
                    {formData.scope_of_work.includes("Other") ? "✓ " : "+ "}
                    Other
                  </button>
                </div>
                {formData.scope_of_work.includes("Other") && (
                  <Input
                    placeholder="Specify other scope of work..."
                    value={formData.scope_other}
                    onChange={(e) => update("scope_other", e.target.value)}
                    className={`mt-2 ${formErrors.scope_other ? "border-red-300 focus:ring-red-500" : ""}`}
                    maxLength={MAX_OTHER_LENGTH}
                  />
                )}
                {formErrors.scope_other && formData.scope_of_work.includes("Other") && (
                  <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.scope_other}
                  </p>
                )}
                {formData.scope_of_work.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.scope_of_work.length} selected
                  </p>
                )}
              </FormField>

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Expected Budget">
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      className={`${selectClass} pl-10`}
                      value={formData.budget_range}
                      onChange={(e) => update("budget_range", e.target.value)}
                    >
                      <option value="">Select budget range</option>
                      {BUDGET_RANGES.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>

                <FormField label="Preferred Design Style" error={formErrors.design_style_other}>
                  <div className="relative">
                    <Palette className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      className={`${selectClass} pl-10`}
                      value={formData.design_style}
                      onChange={(e) => {
                        update("design_style", e.target.value)
                        if (e.target.value !== "Other") update("design_style_other", "")
                      }}
                    >
                      <option value="">Select style</option>
                      {DESIGN_STYLES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.design_style === "Other" && (
                    <Input
                      placeholder="Specify design style..."
                      value={formData.design_style_other}
                      onChange={(e) => update("design_style_other", e.target.value)}
                      className={`mt-2 ${formErrors.design_style_other ? "border-red-300 focus:ring-red-500" : ""}`}
                    />
                  )}
                </FormField>
              </div>

              <FormField label="Expected Timeline">
                <div className="flex flex-wrap gap-2">
                  {TIMELINE_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => update("timeline", formData.timeline === t ? "" : t)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        formData.timeline === t
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-input bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          </SectionCard>

          {/* ── Section 4: Lead Source & Assignment (side by side) ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard icon={Globe} title="Lead Source">
              <div className="space-y-5">
                <FormField label="Source Platform" required error={formErrors.source || formErrors.source_other}>
                  <div data-error={!!formErrors.source}>
                    <select
                      className={`${selectClass} ${formErrors.source ? "border-red-300 focus:ring-red-500" : ""}`}
                      value={formData.source}
                      onChange={(e) => {
                        update("source", e.target.value)
                        if (e.target.value !== "Other") update("source_other", "")
                        if (e.target.value !== "Referral") update("referral_name", "")
                      }}
                    >
                      <option value="" disabled>
                        Select source
                      </option>
                      {LEAD_SOURCES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.source === "Other" && (
                    <Input
                      placeholder="Specify source..."
                      value={formData.source_other}
                      onChange={(e) => update("source_other", e.target.value)}
                      className={`mt-2 ${formErrors.source_other ? "border-red-300 focus:ring-red-500" : ""}`}
                    />
                  )}
                </FormField>

                {formData.source === "Referral" && (
                  <FormField label="Referred By" required error={formErrors.referral_name}>
                    <Input
                      placeholder="Name of referrer"
                      value={formData.referral_name}
                      onChange={(e) => update("referral_name", e.target.value)}
                      className={formErrors.referral_name ? "border-red-300 focus:ring-red-500" : ""}
                    />
                  </FormField>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={UserPlus} title="Assignment">
              <div className="space-y-5">
                <FormField label="Assign To">
                  <select
                    className={selectClass}
                    value={formData.assigned_to_id}
                    onChange={(e) => update("assigned_to_id", e.target.value)}
                  >
                    <option value="">Auto-assign to me</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role?.replace("_", " ")})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Priority Level">
                  <div className="flex flex-wrap gap-2">
                    {PRIORITY_LEVELS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => update("priority", p.value)}
                        className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all ${
                          formData.priority === p.value
                            ? `${p.color} border-2 shadow-sm`
                            : "border-input bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </FormField>
              </div>
            </SectionCard>
          </div>

          {/* ── Section 5: Scheduling ── */}
          <SectionCard icon={CalendarDays} title="Scheduling">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Possession Date" error={formErrors.possession_date}>
                <div className="relative" data-error={!!formErrors.possession_date}>
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.possession_date}
                    onChange={(e) => {
                      update("possession_date", e.target.value)
                      // Move-in = 7 days after possession if future, or 7 days from today if past
                      if (e.target.value) {
                        const pDate = new Date(e.target.value)
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const baseDate = pDate > today ? pDate : today
                        const moveIn = new Date(baseDate)
                        moveIn.setDate(moveIn.getDate() + 7)
                        update("move_in_date", moveIn.toISOString().split("T")[0])
                      } else {
                        update("move_in_date", "")
                      }
                    }}
                    className={`pl-10 ${formErrors.possession_date ? "border-red-300 focus:ring-red-500" : ""}`}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Can be a past date (already possessed) or future date.
                  </p>
                </div>
              </FormField>

              <FormField label="Move-in Date" error={undefined}>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.move_in_date}
                    onChange={(e) => update("move_in_date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="pl-10"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formData.possession_date
                      ? new Date(formData.possession_date) > new Date()
                        ? "Auto-set to 7 days after possession."
                        : "Auto-set to 7 days from today (possession is in the past)."
                      : "Select possession date first."}
                    {" "}Adjust if needed.
                  </p>
                </div>
              </FormField>

              <FormField label="Site Visit Availability" error={formErrors.site_visit_other}>
                <select
                  className={selectClass}
                  value={formData.site_visit_availability}
                  onChange={(e) => {
                    update("site_visit_availability", e.target.value)
                    if (e.target.value !== "OTHER") update("site_visit_other", "")
                  }}
                >
                  <option value="">Select availability</option>
                  {SITE_VISIT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {formData.site_visit_availability === "OTHER" && (
                  <Input
                    placeholder="e.g. Evenings after 6 PM, Specific date..."
                    value={formData.site_visit_other}
                    onChange={(e) => update("site_visit_other", e.target.value)}
                    className={`mt-2 ${formErrors.site_visit_other ? "border-red-300 focus:ring-red-500" : ""}`}
                    maxLength={MAX_OTHER_LENGTH}
                  />
                )}
              </FormField>
            </div>
          </SectionCard>

          {/* ── Section 6: Notes & Attachments ── */}
          <SectionCard icon={MessageSquare} title="Notes & Requirements">
            <div className="space-y-5">
              <FormField label="Client Notes" error={formErrors.notes}>
                <Textarea
                  placeholder="Enter any preliminary notes from initial contact..."
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  maxLength={MAX_NOTES_LENGTH}
                  className={formErrors.notes ? "border-red-300 focus:ring-red-500" : ""}
                />
                <div className="flex justify-end">
                  <span className={`text-xs ${formData.notes.length > MAX_NOTES_LENGTH * 0.9 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {formData.notes.length}/{MAX_NOTES_LENGTH}
                  </span>
                </div>
              </FormField>

              <FormField label="Special Requirements" error={formErrors.special_requirements}>
                <Textarea
                  placeholder="Any specific must-haves or dealbreakers..."
                  rows={3}
                  value={formData.special_requirements}
                  onChange={(e) => update("special_requirements", e.target.value)}
                  maxLength={MAX_SPECIAL_REQ_LENGTH}
                  className={formErrors.special_requirements ? "border-red-300 focus:ring-red-500" : ""}
                />
                <div className="flex justify-end">
                  <span className={`text-xs ${formData.special_requirements.length > MAX_SPECIAL_REQ_LENGTH * 0.9 ? "text-orange-500" : "text-muted-foreground"}`}>
                    {formData.special_requirements.length}/{MAX_SPECIAL_REQ_LENGTH}
                  </span>
                </div>
              </FormField>

              {/* Categorized File Uploads */}
              <div className="space-y-4 sm:col-span-2">
                <label className="text-sm font-medium">Attachments</label>
                {([
                  { key: "floor_plan", label: "Floor Plans", icon: "", accept: "image/jpeg,image/png,image/webp,application/pdf" },
                  { key: "reference_images", label: "Reference / Inspiration Images", icon: "", accept: "image/jpeg,image/png,image/webp" },
                  { key: "site_photos", label: "Site Photos", icon: "", accept: "image/jpeg,image/png,image/webp" },
                  { key: "documents", label: "Documents (BOQ, Agreements, etc.)", icon: "", accept: "image/jpeg,image/png,image/webp,application/pdf" },
                ] as const).map((cat) => (
                  <div key={cat.key} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        <span>{cat.icon}</span> {cat.label}
                        {formData.uploads[cat.key].length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ({formData.uploads[cat.key].length} file{formData.uploads[cat.key].length > 1 ? "s" : ""})
                          </span>
                        )}
                      </span>
                      <FileUpload
                        value={null}
                        onChange={(url) => {
                          if (url) {
                            const current = formData.uploads[cat.key]
                            update("uploads", { ...formData.uploads, [cat.key]: [...current, url] })
                          }
                        }}
                        category="leads"
                        accept={cat.accept}
                        maxSizeMB={25}
                        label="Upload"
                        compact
                      />
                    </div>
                    {formData.uploads[cat.key].length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.uploads[cat.key].map((url, idx) => (
                          <div key={idx} className="relative group">
                            {url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                              <img src={url} alt="" className="h-16 w-16 rounded-md object-cover border" />
                            ) : (
                              <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-muted">
                                <span className="text-[10px] text-muted-foreground font-mono">PDF</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = formData.uploads[cat.key].filter((_, i) => i !== idx)
                                update("uploads", { ...formData.uploads, [cat.key]: updated })
                              }}
                              className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Bottom sticky save bar */}
        <div className="sticky bottom-0 -mx-4 mt-8 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {formData.scope_of_work.length > 0 && (
                <span className="mr-3">
                  <Star className="mr-1 inline h-3.5 w-3.5" />
                  {formData.scope_of_work.length} scope items
                </span>
              )}
              {formData.budget_range && (
                <span>
                  <IndianRupee className="mr-1 inline h-3.5 w-3.5" />
                  {formData.budget_range}
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/sales/leads")}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="min-w-[120px]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save Lead
              </Button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

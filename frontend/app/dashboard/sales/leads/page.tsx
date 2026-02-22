"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Lead, LeadStatus } from "@/types"
import { useToast } from "@/components/ui/use-toast"
import { PageHeader } from "@/components/layout/page-header"
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
import { Plus, Search, Loader2, Users, Phone, Building2 } from "lucide-react"

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Walk-in",
  "Advertisement",
  "Real Estate Partner",
  "Other",
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
]

const DESIGN_STYLES = [
  "Modern",
  "Contemporary",
  "Minimalist",
  "Traditional",
  "Industrial",
  "Scandinavian",
  "Bohemian",
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
]

const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "CONVERTED",
  "LOST",
]

function getStatusBadgeVariant(status: LeadStatus) {
  switch (status) {
    case "NEW":
      return "default" as const
    case "CONTACTED":
      return "secondary" as const
    case "QUALIFIED":
      return "default" as const
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

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

const INITIAL_FORM = {
  // Section 1: Contact
  name: "",
  contact_number: "",
  email: "",
  source: "",
  location: "",
  notes: "",
  // Section 2: Project Details
  property_type: "",
  property_status: "",
  carpet_area: "",
  scope_of_work: [] as string[],
  // Section 3: Preferences
  budget_range: "",
  design_style: "",
  possession_date: "",
  site_visit_availability: "",
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function LeadsPage() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [formStep, setFormStep] = useState(0)
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await api.get("/crm/leads")
      return response.data.items ?? response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Build payload, strip empty strings to undefined
      const payload: Record<string, unknown> = {
        name: data.name,
        contact_number: data.contact_number,
        source: data.source,
      }
      if (data.email) payload.email = data.email
      if (data.location) payload.location = data.location
      if (data.notes) payload.notes = data.notes
      if (data.property_type) payload.property_type = data.property_type
      if (data.property_status) payload.property_status = data.property_status
      if (data.carpet_area) payload.carpet_area = Number(data.carpet_area)
      if (data.scope_of_work.length > 0) payload.scope_of_work = data.scope_of_work
      if (data.budget_range) payload.budget_range = data.budget_range
      if (data.design_style) payload.design_style = data.design_style
      if (data.possession_date) payload.possession_date = data.possession_date
      if (data.site_visit_availability)
        payload.site_visit_availability = data.site_visit_availability

      const response = await api.post("/crm/leads", payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setOpen(false)
      setFormData(INITIAL_FORM)
      setFormErrors({})
      setFormStep(0)
    },
  })

  const validateStep = useCallback(
    (step: number): boolean => {
      const errors: Record<string, string> = {}
      if (step === 0) {
        if (formData.name.length < 2) errors.name = "Name must be at least 2 characters"
        if (!formData.contact_number) errors.contact_number = "Contact number is required"
        if (!formData.source) errors.source = "Lead source is required"
      }
      setFormErrors(errors)
      return Object.keys(errors).length === 0
    },
    [formData]
  )

  const handleNext = useCallback(() => {
    if (validateStep(formStep)) {
      setFormStep((s) => s + 1)
    }
  }, [formStep, validateStep])

  const handleSubmit = useCallback(() => {
    if (!validateStep(0)) {
      setFormStep(0)
      return
    }
    createMutation.mutate(formData)
  }, [formData, createMutation, validateStep])

  const toggleScope = useCallback((scope: string) => {
    setFormData((prev) => ({
      ...prev,
      scope_of_work: prev.scope_of_work.includes(scope)
        ? prev.scope_of_work.filter((s) => s !== scope)
        : [...prev.scope_of_work, scope],
    }))
  }, [])

  const resetAndOpen = useCallback(() => {
    setFormData(INITIAL_FORM)
    setFormErrors({})
    setFormStep(0)
    setOpen(true)
  }, [])

  const filteredLeads = leads.filter((lead) => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.contact_number.includes(q)
      )
    }
    return true
  })

  const statusCounts = LEAD_STATUSES.reduce(
    (acc, status) => {
      acc[status] = leads.filter((l) => l.status === status).length
      return acc
    },
    {} as Record<string, number>
  )

  const STEP_LABELS = ["Contact", "Project Details", "Preferences"]

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-6">
        <PageHeader
          icon={Users}
          title="Leads Pipeline"
          subtitle="Track and manage leads through the sales pipeline"
          gradient="linear-gradient(135deg, #8B5CF6, #6366F1)"
          action={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetAndOpen}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
                <DialogDescription>
                  Capture lead information in a few quick steps.
                </DialogDescription>
              </DialogHeader>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 pb-2">
                {STEP_LABELS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (i < formStep || (i > formStep && validateStep(formStep))) {
                        setFormStep(i)
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      formStep === i
                        ? "bg-primary text-primary-foreground"
                        : i < formStep
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-background/30 text-[10px]">
                      {i + 1}
                    </span>
                    {label}
                  </button>
                ))}
              </div>

              <div>
                {/* ── Step 1: Contact ── */}
                {formStep === 0 && (
                  <div className="space-y-4 py-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="lead_name">Full Name *</Label>
                        <Input
                          id="lead_name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                        {formErrors.name && (
                          <p className="text-xs text-destructive">{formErrors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_number">Phone *</Label>
                        <Input
                          id="contact_number"
                          placeholder="+91 9876543210"
                          value={formData.contact_number}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              contact_number: e.target.value,
                            }))
                          }
                        />
                        {formErrors.contact_number && (
                          <p className="text-xs text-destructive">
                            {formErrors.contact_number}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="lead_email">Email</Label>
                        <Input
                          id="lead_email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, email: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lead_source">Source *</Label>
                        <select
                          id="lead_source"
                          className={selectClass}
                          value={formData.source}
                          onChange={(e) =>
                            setFormData((p) => ({ ...p, source: e.target.value }))
                          }
                        >
                          <option value="" disabled>
                            Select source
                          </option>
                          {LEAD_SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {formErrors.source && (
                          <p className="text-xs text-destructive">{formErrors.source}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead_location">Location</Label>
                      <Input
                        id="lead_location"
                        placeholder="e.g. Whitefield, Bangalore"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, location: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lead_notes">Notes</Label>
                      <textarea
                        id="lead_notes"
                        className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        placeholder="Any initial notes about the lead..."
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, notes: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Project Details ── */}
                {formStep === 1 && (
                  <div className="space-y-4 py-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Property Type</Label>
                        <select
                          className={selectClass}
                          value={formData.property_type}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              property_type: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select type</option>
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Property Status</Label>
                        <select
                          className={selectClass}
                          value={formData.property_status}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              property_status: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select status</option>
                          {PROPERTY_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="carpet_area">Carpet Area (sqft)</Label>
                      <Input
                        id="carpet_area"
                        type="number"
                        placeholder="e.g. 1200"
                        value={formData.carpet_area}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            carpet_area: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Scope of Work</Label>
                      <div className="flex flex-wrap gap-2">
                        {SCOPE_OPTIONS.map((scope) => {
                          const selected = formData.scope_of_work.includes(scope)
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
                  </div>
                )}

                {/* ── Step 3: Preferences ── */}
                {formStep === 2 && (
                  <div className="space-y-4 py-2">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Budget Range</Label>
                        <select
                          className={selectClass}
                          value={formData.budget_range}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              budget_range: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select budget</option>
                          {BUDGET_RANGES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Design Style</Label>
                        <select
                          className={selectClass}
                          value={formData.design_style}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              design_style: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select style</option>
                          {DESIGN_STYLES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Possession Date</Label>
                        <Input
                          type="date"
                          value={formData.possession_date}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              possession_date: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Site Visit Availability</Label>
                        <select
                          className={selectClass}
                          value={formData.site_visit_availability}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              site_visit_availability: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select availability</option>
                          {SITE_VISIT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {createMutation.isError && (
                  <p className="text-sm text-destructive py-2">
                    Failed to create lead. Please try again.
                  </p>
                )}

                <DialogFooter className="gap-2 pt-2">
                  {formStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormStep((s) => s - 1)}
                    >
                      Back
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  {formStep < 2 ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={createMutation.isPending}
                      onClick={handleSubmit}
                    >
                      {createMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Lead
                    </Button>
                  )}
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
          }
        />

        {/* Status Summary Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({leads.length})
          </Button>
          {LEAD_STATUSES.map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? "all" : status)
              }
            >
              {status.replace("_", " ")} ({statusCounts[status] || 0})
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/sales/leads/${lead.id}`)
                      }
                    >
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{lead.contact_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.property_type ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {lead.property_type.replace("_", " ")}
                              {lead.carpet_area ? ` - ${lead.carpet_area} sqft` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{lead.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(lead.status)}>
                          {lead.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {lead.assigned_to?.full_name ?? "Unassigned"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No leads found</p>
                      <p className="text-xs text-muted-foreground">
                        Create your first lead to get started
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {filteredLeads.length} of {leads.length} lead(s)
        </p>
      </div>
    </RoleGuard>
  )
}

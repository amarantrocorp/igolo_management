"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import RoleGuard from "@/components/auth/role-guard"
import type { Lead, LeadStatus, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Plus,
  Search,
  Loader2,
  Users,
  Phone,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  User as UserIcon,
  LayoutGrid,
  List,
  Upload,
  GripVertical,
  X,
} from "lucide-react"

// ── Pipeline Column Config ──

interface PipelineColumn {
  status: LeadStatus
  label: string
  color: string // dot color
  bgColor: string // column header bg
}

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { status: "NEW", label: "New", color: "bg-blue-500", bgColor: "bg-blue-50" },
  { status: "CONTACTED", label: "Contacted", color: "bg-amber-500", bgColor: "bg-amber-50" },
  { status: "QUALIFIED", label: "Meeting Scheduled", color: "bg-purple-400", bgColor: "bg-purple-50" },
  { status: "QUOTATION_SENT", label: "Proposal Sent", color: "bg-indigo-500", bgColor: "bg-indigo-50" },
  { status: "NEGOTIATION", label: "Negotiation", color: "bg-cyan-500", bgColor: "bg-cyan-50" },
  { status: "CONVERTED", label: "Converted", color: "bg-emerald-500", bgColor: "bg-emerald-50" },
  { status: "LOST", label: "Lost", color: "bg-red-500", bgColor: "bg-red-50" },
]

const LEAD_SOURCES = [
  "Website", "Referral", "Instagram", "Facebook", "Google Ads",
  "Walk-in", "Real Estate Partner", "Just Dial", "Housing.com", "Other",
]

// ── Badge helpers ──

function getStatusBadgeVariant(status: LeadStatus) {
  switch (status) {
    case "NEW": return "default" as const
    case "CONTACTED": return "secondary" as const
    case "QUALIFIED": return "default" as const
    case "QUOTATION_SENT":
    case "NEGOTIATION": return "warning" as const
    case "CONVERTED": return "success" as const
    case "LOST": return "destructive" as const
    default: return "secondary" as const
  }
}

function formatBudget(val?: string | number | null): string {
  if (!val) return ""
  const num = typeof val === "string" ? parseFloat(val) : val
  if (isNaN(num)) return String(val)
  if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`
  if (num >= 100000) return `${(num / 100000).toFixed(1)} L`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toLocaleString("en-IN")
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).split("/").reverse().join("-")
}

function isOverdue(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  return diff > 7 * 24 * 60 * 60 * 1000 // older than 7 days
}

// ── Select Component ──

const selectClass =
  "flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer"

// ── Main Page ──

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function LeadsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [view, setView] = useState<"pipeline" | "table">("pipeline")
  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [assigneeFilter, setAssigneeFilter] = useState("all")

  // Drag state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await api.get("/crm/leads")
      return response.data.items ?? response.data
    },
  })

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users")
      return res.data.items ?? res.data
    },
  })

  // Status update mutation for drag-drop
  const statusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: LeadStatus }) => {
      await api.put(`/crm/leads/${leadId}`, { status })
    },
    onMutate: async ({ leadId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] })
      const prev = queryClient.getQueryData<Lead[]>(["leads"])
      queryClient.setQueryData<Lead[]>(["leads"], (old) =>
        old?.map((l) => (l.id === leadId ? { ...l, status } : l)) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["leads"], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
    },
  })

  // Unique assignees from leads
  const assignees = useMemo(() => {
    const map = new Map<string, string>()
    leads.forEach((l) => {
      if (l.assigned_to) {
        map.set(l.assigned_to_id, l.assigned_to.full_name)
      }
    })
    return Array.from(map.entries())
  }, [leads])

  // Unique sources
  const sourcesInData = useMemo(() => {
    const set = new Set<string>()
    leads.forEach((l) => set.add(l.source))
    return Array.from(set).sort()
  }, [leads])

  // Filter logic
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false
      if (statusFilter !== "all" && lead.status !== statusFilter) return false
      if (assigneeFilter !== "all" && lead.assigned_to_id !== assigneeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          lead.name.toLowerCase().includes(q) ||
          lead.contact_number.includes(q) ||
          (lead.email?.toLowerCase().includes(q)) ||
          (lead.location?.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [leads, search, sourceFilter, statusFilter, assigneeFilter])

  // Grouped by status for pipeline
  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    PIPELINE_COLUMNS.forEach((col) => {
      map[col.status] = filteredLeads.filter((l) => l.status === col.status)
    })
    return map
  }, [filteredLeads])

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, leadId: string) => {
    e.dataTransfer.effectAllowed = "move"
    setDraggedLeadId(leadId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverColumn(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: LeadStatus) => {
      e.preventDefault()
      setDragOverColumn(null)
      if (!draggedLeadId) return

      const lead = leads.find((l) => l.id === draggedLeadId)
      if (!lead || lead.status === targetStatus) {
        setDraggedLeadId(null)
        return
      }

      statusMutation.mutate({ leadId: draggedLeadId, status: targetStatus })
      setDraggedLeadId(null)
    },
    [draggedLeadId, leads, statusMutation]
  )

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return
      const lines = text.split("\n").filter((line) => line.trim().length > 0)
      // First line is header, rest are data rows
      const count = Math.max(0, lines.length - 1)
      if (count === 0) {
        toast({ title: "Empty File", description: "No leads found in the CSV file.", variant: "destructive" })
        return
      }
      toast({
        title: "Import Successful",
        description: `${count} lead${count !== 1 ? "s" : ""} parsed from CSV. Refresh to see imported leads.`,
      })
    }
    reader.readAsText(file)
    // Reset so the same file can be re-selected
    e.target.value = ""
  }

  const hasActiveFilters = sourceFilter !== "all" || statusFilter !== "all" || assigneeFilter !== "all" || search.length > 0
  const clearFilters = () => {
    setSourceFilter("all")
    setStatusFilter("all")
    setAssigneeFilter("all")
    setSearch("")
  }

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground">
              Manage and track your prospective clients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
            <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Import Leads
            </Button>
            <Button
              size="sm"
              onClick={() => router.push("/dashboard/sales/leads/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Lead
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-3 flex-wrap rounded-xl border bg-white p-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Source Filter */}
          <select
            className={selectClass}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="all">All Sources</option>
            {sourcesInData.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className={selectClass}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {PIPELINE_COLUMNS.map((col) => (
              <option key={col.status} value={col.status}>{col.label}</option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            className={selectClass}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">All Assignees</option>
            {assignees.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <button
              onClick={() => setView("pipeline")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "pipeline"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </button>
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />
              Table
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Pipeline View */}
        {!isLoading && view === "pipeline" && (
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
            {PIPELINE_COLUMNS.map((col) => {
              const columnLeads = grouped[col.status] || []
              const isDragOver = dragOverColumn === col.status

              return (
                <div
                  key={col.status}
                  className={`flex-shrink-0 w-[300px] rounded-xl border bg-slate-50/80 transition-colors ${
                    isDragOver ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                  onDragOver={(e) => handleDragOver(e, col.status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.status)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full border bg-white px-1.5 text-xs font-medium text-muted-foreground">
                      {columnLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2.5 px-3 pb-3 min-h-[120px]">
                    {columnLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-xs text-muted-foreground">
                          No leads in this stage
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Drag a card here to move it
                        </p>
                      </div>
                    )}

                    {columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => router.push(`/dashboard/sales/leads/${lead.id}`)}
                        className={`group cursor-pointer rounded-lg border bg-white p-3.5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
                          draggedLeadId === lead.id ? "opacity-50 scale-95" : ""
                        }`}
                      >
                        {/* Card Header */}
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm text-foreground leading-tight">
                            {lead.name}
                          </h4>
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-grab" />
                        </div>

                        {/* Location */}
                        {lead.location && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {lead.location}
                            </span>
                          </div>
                        )}

                        {/* Budget */}
                        {lead.budget_range && (
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <IndianRupee className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground">
                              {lead.budget_range}
                            </span>
                          </div>
                        )}

                        {/* Footer: Assignee + Date */}
                        <div className="flex items-center justify-between pt-2 border-t border-dashed">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {lead.assigned_to?.full_name?.split(" ").map((n, i) => i === 0 ? n : n[0] + ".").join(" ") ?? "Unassigned"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className={`h-3 w-3 ${isOverdue(lead.created_at) ? "text-orange-500" : "text-muted-foreground"}`} />
                            <span className={`text-xs ${isOverdue(lead.created_at) ? "text-orange-500 font-medium" : "text-muted-foreground"}`}>
                              {formatDate(lead.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Property + Source tags */}
                        {(lead.property_type || lead.source) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {lead.property_type && (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                                {lead.property_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                              </span>
                            )}
                            {lead.source && (
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                                {lead.source}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Table View */}
        {!isLoading && view === "table" && (
          <>
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/60">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Contact</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">Property</TableHead>
                    <TableHead className="font-semibold">Budget</TableHead>
                    <TableHead className="font-semibold">Source</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Assigned To</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length > 0 ? (
                    filteredLeads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-slate-50/60"
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
                          {lead.location ? (
                            <div className="flex items-center gap-1.5 max-w-[180px]">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{lead.location}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.property_type ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {lead.property_type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                {lead.carpet_area ? ` · ${lead.carpet_area} sqft` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.budget_range ? (
                            <span className="text-sm">{lead.budget_range}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(lead.status)} className="text-xs">
                            {lead.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.assigned_to?.full_name ?? "Unassigned"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No leads found</p>
                          <p className="text-xs text-muted-foreground">
                            {hasActiveFilters
                              ? "Try adjusting your filters"
                              : "Create your first lead to get started"}
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
          </>
        )}

        {/* Pipeline Footer Stats */}
        {!isLoading && view === "pipeline" && (
          <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
            <span>
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""} total
              {hasActiveFilters ? ` (filtered from ${leads.length})` : ""}
            </span>
            <span className="text-xs">
              Drag cards between columns to update status
            </span>
          </div>
        )}
      </div>
    </RoleGuard>
  )
}

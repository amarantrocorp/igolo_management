"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Lead, LeadStatus } from "@/types"
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
import {
  Plus,
  Search,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact_number: z.string().min(1, "Contact number is required"),
  source: z.string().min(1, "Lead source is required"),
  notes: z.string().optional(),
})

type CreateLeadFormValues = z.infer<typeof createLeadSchema>

const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Social Media",
  "Walk-in",
  "Advertisement",
  "Real Estate Partner",
  "Other",
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
      return "warning" as const
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

export default function LeadsPage() {
  const [open, setOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await api.get("/leads")
      return response.data.items ?? response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateLeadFormValues) => {
      const response = await api.post("/leads", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      setOpen(false)
      form.reset()
      toast({ title: "Lead created", description: "New lead has been added to the pipeline." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive",
      })
    },
  })

  const form = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: "",
      contact_number: "",
      source: "",
      notes: "",
    },
  })

  const filteredLeads = leads.filter((lead) => {
    if (statusFilter !== "all" && lead.status !== statusFilter) return false
    return true
  })

  const columns: ColumnDef<Lead>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "contact_number",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.original.contact_number}</span>
        </div>
      ),
    },
    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.source}</Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)}>
          {row.original.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "assigned_to",
      header: "Assigned To",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.assigned_to?.full_name ?? "Unassigned"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast({
              title: "View lead",
              description: `Detailed view for ${row.original.name} is not yet implemented.`,
            })
          }}
        >
          View
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredLeads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const statusCounts = LEAD_STATUSES.reduce(
    (acc, status) => {
      acc[status] = leads.filter((l) => l.status === status).length
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <RoleGuard
      allowedRoles={["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Users className="h-6 w-6" />
              Leads Pipeline
            </h2>
            <p className="text-muted-foreground">
              Track and manage leads through the sales pipeline
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
                <DialogDescription>
                  Add a new lead to the sales pipeline.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="lead_name">Full Name</Label>
                    <Input
                      id="lead_name"
                      placeholder="John Doe"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_number">Contact Number</Label>
                    <Input
                      id="contact_number"
                      placeholder="+91 9876543210"
                      {...form.register("contact_number")}
                    />
                    {form.formState.errors.contact_number && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.contact_number.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lead_source">Lead Source</Label>
                    <select
                      id="lead_source"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      {...form.register("source")}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select lead source
                      </option>
                      {LEAD_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.source && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.source.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Additional details about the lead..."
                      {...form.register("notes")}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Lead
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
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

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredLeads.length}{" "}
            lead(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>

  )
}

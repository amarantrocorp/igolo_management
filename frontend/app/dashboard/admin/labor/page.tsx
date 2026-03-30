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
import type { LaborTeam, Worker } from "@/types"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Loader2,
  HardHat,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const SPECIALIZATIONS = [
  { value: "CIVIL", label: "Civil" },
  { value: "CARPENTRY", label: "Carpentry" },
  { value: "PAINTING", label: "Painting" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "GENERAL", label: "General" },
]

const PAYMENT_MODELS = [
  { value: "DAILY_WAGE", label: "Daily Wage" },
  { value: "CONTRACT_FIXED", label: "Contract (Fixed)" },
]

const SKILL_LEVELS = [
  { value: "HELPER", label: "Helper" },
  { value: "SKILLED", label: "Skilled" },
  { value: "FOREMAN", label: "Foreman" },
]

const createTeamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  leader_name: z.string().min(2, "Leader name is required"),
  contact_number: z.string().optional(),
  specialization: z.string().min(1, "Specialization is required"),
  payment_model: z.string().min(1, "Payment model is required"),
  default_daily_rate: z.coerce.number().min(1, "Daily rate must be positive"),
})

type CreateTeamForm = z.infer<typeof createTeamSchema>

const addWorkerSchema = z.object({
  name: z.string().min(2, "Worker name is required"),
  skill_level: z.string().min(1, "Skill level is required"),
  daily_rate: z.coerce.number().optional(),
  phone: z.string().optional(),
})

type AddWorkerForm = z.infer<typeof addWorkerSchema>

function getSpecBadgeVariant(spec: string) {
  switch (spec) {
    case "CARPENTRY":
      return "default"
    case "PAINTING":
      return "secondary"
    case "ELECTRICAL":
      return "warning"
    case "CIVIL":
      return "outline"
    default:
      return "outline"
  }
}

export default function LaborTeamsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [workersOpen, setWorkersOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<LaborTeam | null>(null)
  const [addWorkerOpen, setAddWorkerOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: teams = [], isLoading } = useQuery<LaborTeam[]>({
    queryKey: ["labor-teams"],
    queryFn: async () => {
      const response = await api.get("/labor/teams")
      return response.data.items ?? response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const response = await api.post("/labor/teams", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labor-teams"] })
      setCreateOpen(false)
      createForm.reset()
      toast({ title: "Team created", description: "New labor team added successfully." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create team. Please try again.",
        variant: "destructive",
      })
    },
  })

  const addWorkerMutation = useMutation({
    mutationFn: async ({ teamId, data }: { teamId: string; data: AddWorkerForm }) => {
      const response = await api.post(`/labor/teams/${teamId}/workers`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["labor-teams"] })
      setAddWorkerOpen(false)
      workerForm.reset()
      toast({ title: "Worker added", description: "Worker added to team successfully." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add worker.",
        variant: "destructive",
      })
    },
  })

  const createForm = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      leader_name: "",
      contact_number: "",
      specialization: "",
      payment_model: "DAILY_WAGE",
      default_daily_rate: 0,
    },
  })

  const workerForm = useForm<AddWorkerForm>({
    resolver: zodResolver(addWorkerSchema),
    defaultValues: {
      name: "",
      skill_level: "HELPER",
      daily_rate: undefined,
      phone: "",
    },
  })

  const columns: ColumnDef<LaborTeam>[] = [
    {
      accessorKey: "name",
      header: "Team Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            Lead: {row.original.leader_name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "specialization",
      header: "Specialization",
      cell: ({ row }) => (
        <Badge variant={getSpecBadgeVariant(row.original.specialization) as "default" | "secondary" | "outline" | "destructive"}>
          {row.original.specialization}
        </Badge>
      ),
    },
    {
      accessorKey: "payment_model",
      header: "Payment Model",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.payment_model === "DAILY_WAGE" ? "Daily Wage" : "Contract"}
        </Badge>
      ),
    },
    {
      accessorKey: "default_daily_rate",
      header: "Daily Rate",
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.original.default_daily_rate)}
        </span>
      ),
    },
    {
      id: "workers_count",
      header: "Workers",
      cell: ({ row }) => (
        <span className="text-sm">{row.original.workers?.length ?? 0}</span>
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
            setSelectedTeam(row.original)
            setWorkersOpen(true)
          }}
        >
          <Users className="mr-1 h-3 w-3" />
          Workers
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: teams,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        <PageHeader
          icon={HardHat}
          title="Labor Teams"
          subtitle="Manage labor teams, workers, and specializations"
          gradient="linear-gradient(135deg, #F43F5E, #E11D48)"
          action={
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Labor Team</DialogTitle>
                  <DialogDescription>
                    Add a new labor team to the system.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Team Name</Label>
                      <Input placeholder="Roy's Painting Crew" {...createForm.register("name")} />
                      {createForm.formState.errors.name && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Leader Name</Label>
                        <Input placeholder="Rajesh Kumar" {...createForm.register("leader_name")} />
                        {createForm.formState.errors.leader_name && (
                          <p className="text-xs text-destructive">{createForm.formState.errors.leader_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input placeholder="+91 9876543210" {...createForm.register("contact_number")} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Specialization</Label>
                        <Select
                          value={createForm.watch("specialization")}
                          onValueChange={(v) => createForm.setValue("specialization", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SPECIALIZATIONS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {createForm.formState.errors.specialization && (
                          <p className="text-xs text-destructive">{createForm.formState.errors.specialization.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Model</Label>
                        <Select
                          value={createForm.watch("payment_model")}
                          onValueChange={(v) => createForm.setValue("payment_model", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_MODELS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Daily Rate (per worker)</Label>
                      <Input
                        type="number"
                        placeholder="800"
                        {...createForm.register("default_daily_rate")}
                      />
                      {createForm.formState.errors.default_daily_rate && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.default_daily_rate.message}</p>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Team
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search teams..."
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
                        : flexRender(header.column.columnDef.header, header.getContext())}
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
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <HardHat className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No labor teams found</p>
                      <p className="text-xs text-muted-foreground">
                        Create a team to start managing labor
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
            {table.getFilteredRowModel().rows.length} team(s) total
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

        {/* Workers Dialog */}
        <Dialog open={workersOpen} onOpenChange={setWorkersOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTeam?.name} — Workers
              </DialogTitle>
              <DialogDescription>
                {selectedTeam?.specialization} team led by {selectedTeam?.leader_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Skill Level</TableHead>
                      <TableHead>Daily Rate</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTeam?.workers?.length ? (
                      selectedTeam.workers.map((worker: Worker) => (
                        <TableRow key={worker.id}>
                          <TableCell className="font-medium">{worker.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{worker.skill_level}</Badge>
                          </TableCell>
                          <TableCell>
                            {worker.daily_rate
                              ? formatCurrency(worker.daily_rate)
                              : <span className="text-muted-foreground">Team rate</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {worker.phone || "--"}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          No workers added yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Add Worker inline */}
              {!addWorkerOpen ? (
                <Button variant="outline" size="sm" onClick={() => setAddWorkerOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Worker
                </Button>
              ) : (
                <form
                  onSubmit={workerForm.handleSubmit((data) =>
                    addWorkerMutation.mutate({ teamId: selectedTeam!.id, data })
                  )}
                  className="rounded-md border p-4 space-y-3"
                >
                  <p className="text-sm font-medium">Add New Worker</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name</Label>
                      <Input placeholder="Worker name" {...workerForm.register("name")} />
                      {workerForm.formState.errors.name && (
                        <p className="text-xs text-destructive">{workerForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Skill Level</Label>
                      <Select
                        value={workerForm.watch("skill_level")}
                        onValueChange={(v) => workerForm.setValue("skill_level", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILL_LEVELS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Daily Rate (optional override)</Label>
                      <Input type="number" placeholder="Team rate" {...workerForm.register("daily_rate")} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone</Label>
                      <Input placeholder="+91 ..." {...workerForm.register("phone")} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={addWorkerMutation.isPending}>
                      {addWorkerMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddWorkerOpen(false)
                        workerForm.reset()
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

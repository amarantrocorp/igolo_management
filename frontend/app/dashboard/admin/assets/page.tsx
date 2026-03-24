"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Asset, AssetStatus, AssetCondition, Project } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wrench as WrenchIcon,
  ArrowRightLeft,
  RotateCcw,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_TABS = [
  { label: "All", value: "ALL" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Retired", value: "RETIRED" },
]

const STATUS_COLORS: Record<AssetStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ASSIGNED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  MAINTENANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  RETIRED: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
}

const CONDITION_COLORS: Record<AssetCondition, string> = {
  EXCELLENT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  GOOD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  FAIR: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  POOR: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const PAGE_SIZE = 10

export default function AssetsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState<Asset | null>(null)
  const [returnOpen, setReturnOpen] = useState<Asset | null>(null)

  // Create form
  const [form, setForm] = useState({
    name: "",
    category: "",
    serial_number: "",
    purchase_date: "",
    purchase_cost: 0,
    condition: "GOOD",
    notes: "",
  })

  // Assign form
  const [assignForm, setAssignForm] = useState({
    project_id: "",
    assigned_date: new Date().toISOString().split("T")[0],
  })

  // Return form
  const [returnCondition, setReturnCondition] = useState("GOOD")

  // Fetch assets
  const { data: assets = [], isLoading } = useQuery<Asset[]>({
    queryKey: ["assets", statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter !== "ALL") params.status = statusFilter
      const res = await api.get("/assets", { params })
      return res.data
    },
  })

  // Fetch projects for assign dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects")
      return res.data
    },
  })

  const totalPages = Math.ceil(assets.length / PAGE_SIZE)
  const pageData = assets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Create asset
  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: form.name,
        category: form.category,
        condition: form.condition,
      }
      if (form.serial_number) payload.serial_number = form.serial_number
      if (form.purchase_date) payload.purchase_date = form.purchase_date
      if (form.purchase_cost) payload.purchase_cost = form.purchase_cost
      if (form.notes) payload.notes = form.notes
      return api.post("/assets", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      setCreateOpen(false)
      setForm({ name: "", category: "", serial_number: "", purchase_date: "", purchase_cost: 0, condition: "GOOD", notes: "" })
      toast({ title: "Asset registered" })
    },
    onError: () => toast({ title: "Failed to create asset", variant: "destructive" }),
  })

  // Assign asset
  const assignMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/assets/${assignOpen!.id}/assign`, assignForm)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      setAssignOpen(null)
      setAssignForm({ project_id: "", assigned_date: new Date().toISOString().split("T")[0] })
      toast({ title: "Asset assigned to project" })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Failed to assign asset"
      toast({ title: msg, variant: "destructive" })
    },
  })

  // Return asset
  const returnMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/assets/${returnOpen!.id}/return`, { condition_on_return: returnCondition })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] })
      setReturnOpen(null)
      setReturnCondition("GOOD")
      toast({ title: "Asset returned successfully" })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || "Failed to return asset"
      toast({ title: msg, variant: "destructive" })
    },
  })

  return (
    <RoleGuard allowedRoles={["MANAGER", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        <PageHeader
          icon={WrenchIcon}
          title="Asset Registry"
          subtitle="Track company-owned equipment and assignments"
          gradient="linear-gradient(135deg, #6366F1, #4F46E5)"
          action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Register Asset</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Asset</DialogTitle>
                <DialogDescription>Add equipment to the registry</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Hilti Drill Machine"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Input
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder="e.g., Power Tools"
                    />
                  </div>
                  <div>
                    <Label>Serial Number</Label>
                    <Input
                      value={form.serial_number}
                      onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Purchase Date</Label>
                    <Input
                      type="date"
                      value={form.purchase_date}
                      onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Purchase Cost</Label>
                    <Input
                      type="number"
                      value={form.purchase_cost || ""}
                      onChange={(e) => setForm({ ...form, purchase_cost: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  >
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="POOR">Poor</option>
                  </select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!form.name || !form.category || createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Register
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          }
        />

        {/* Status Tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter(tab.value); setPage(0) }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Assets Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pageData.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <WrenchIcon className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">No assets found</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Serial #</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Purchase Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell className="font-mono text-xs">{asset.serial_number || "-"}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", CONDITION_COLORS[asset.condition])}>
                          {asset.condition}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs", STATUS_COLORS[asset.status])}>
                          {asset.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {asset.purchase_cost ? formatCurrency(asset.purchase_cost) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {asset.status === "AVAILABLE" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAssignOpen(asset)}
                            >
                              <ArrowRightLeft className="mr-1 h-3 w-3" />Assign
                            </Button>
                          )}
                          {asset.status === "ASSIGNED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReturnOpen(asset)}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />Return
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Assign Dialog */}
        <Dialog open={!!assignOpen} onOpenChange={(open) => { if (!open) setAssignOpen(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Asset</DialogTitle>
              <DialogDescription>
                Assign &quot;{assignOpen?.name}&quot; to a project
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Project *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={assignForm.project_id}
                  onChange={(e) => setAssignForm({ ...assignForm, project_id: e.target.value })}
                >
                  <option value="">Select project</option>
                  {projects.map((p: Project) => (
                    <option key={p.id} value={p.id}>
                      {p.client?.user?.full_name || `Project ${p.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Assigned Date</Label>
                <Input
                  type="date"
                  value={assignForm.assigned_date}
                  onChange={(e) => setAssignForm({ ...assignForm, assigned_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => assignMutation.mutate()}
                disabled={!assignForm.project_id || assignMutation.isPending}
              >
                {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Dialog */}
        <Dialog open={!!returnOpen} onOpenChange={(open) => { if (!open) setReturnOpen(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Return Asset</DialogTitle>
              <DialogDescription>
                Return &quot;{returnOpen?.name}&quot; and record condition
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Condition on Return *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => returnMutation.mutate()}
                disabled={returnMutation.isPending}
              >
                {returnMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Return
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { MaterialRequest, MaterialRequestStatus } from "@/types"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  ClipboardList,
  CheckCircle,
  XCircle,
  PackageCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_TABS: { label: string; value: string }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Partially Approved", value: "PARTIALLY_APPROVED" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "Rejected", value: "REJECTED" },
]

const STATUS_COLORS: Record<MaterialRequestStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PARTIALLY_APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  FULFILLED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export default function MaterialRequestsPage() {
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(0)
  const pageSize = 10
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Detail / Approval dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null)
  const [approvalQuantities, setApprovalQuantities] = useState<Record<string, number>>({})

  const { data: requests = [], isLoading } = useQuery<MaterialRequest[]>({
    queryKey: ["material-requests", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      params.set("limit", "200")
      const res = await api.get(`/material-requests?${params.toString()}`)
      return res.data.items ?? res.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, items, notes }: {
      requestId: string
      items: { item_id: string; quantity_approved: number }[]
      notes?: string
    }) => {
      await api.patch(`/material-requests/${requestId}/approve`, { items, notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] })
      setDetailOpen(false)
      setSelectedRequest(null)
      toast({ title: "Request approved" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to approve request.",
        variant: "destructive",
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await api.patch(`/material-requests/${requestId}/reject`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] })
      setDetailOpen(false)
      setSelectedRequest(null)
      toast({ title: "Request rejected" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to reject request.",
        variant: "destructive",
      })
    },
  })

  const fulfillMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await api.post(`/material-requests/${requestId}/fulfill`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-requests"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setDetailOpen(false)
      setSelectedRequest(null)
      toast({ title: "Request fulfilled", description: "Stock has been issued from warehouse." })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to fulfill request.",
        variant: "destructive",
      })
    },
  })

  function openDetail(req: MaterialRequest) {
    setSelectedRequest(req)
    const quantities: Record<string, number> = {}
    req.items.forEach((item) => {
      quantities[item.item_id] = item.quantity_requested
    })
    setApprovalQuantities(quantities)
    setDetailOpen(true)
  }

  function handleApprove() {
    if (!selectedRequest) return
    const items = selectedRequest.items.map((item) => ({
      item_id: item.item_id,
      quantity_approved: approvalQuantities[item.item_id] ?? 0,
    }))
    approveMutation.mutate({ requestId: selectedRequest.id, items })
  }

  // Pagination
  const paged = useMemo(() => {
    const start = page * pageSize
    return requests.slice(start, start + pageSize)
  }, [requests, page])
  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize))

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={ClipboardList}
          title="Material Requests"
          subtitle="Review and approve material indent requests from site supervisors"
          gradient="linear-gradient(135deg, #F59E0B, #D97706)"
        />

        {/* Status filter tabs */}
        <div className="flex gap-1 border-b overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                statusFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => { setStatusFilter(tab.value); setPage(0) }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Requests Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paged.length > 0 ? (
                paged.map((req) => (
                  <TableRow
                    key={req.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openDetail(req)}
                  >
                    <TableCell className="font-mono text-sm">
                      MR-{req.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {req.project_name || req.project_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{req.requested_by_name || "—"}</TableCell>
                    <TableCell>{req.items_count ?? req.items?.length ?? 0}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          req.urgency === "HIGH" && "border-red-500 text-red-600",
                          req.urgency === "MEDIUM" && "border-yellow-500 text-yellow-600"
                        )}
                      >
                        {req.urgency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", STATUS_COLORS[req.status])}>
                        {req.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {req.status === "PENDING" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetail(req)}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Review
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => rejectMutation.mutate(req.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </>
                        )}
                        {(req.status === "APPROVED" || req.status === "PARTIALLY_APPROVED") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fulfillMutation.mutate(req.id)}
                            disabled={fulfillMutation.isPending}
                          >
                            <PackageCheck className="mr-1 h-3.5 w-3.5" />
                            Fulfill
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ClipboardList className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No material requests found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {requests.length} request(s) total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Detail / Approval Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Material Request MR-{selectedRequest?.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                {selectedRequest?.project_name} &middot; Requested by {selectedRequest?.requested_by_name}
              </DialogDescription>
            </DialogHeader>

            {selectedRequest && (
              <div className="space-y-4 py-4">
                {selectedRequest.notes && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <span className="font-medium">Notes:</span> {selectedRequest.notes}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Requested</TableHead>
                      {selectedRequest.status === "PENDING" && (
                        <TableHead>Approve Qty</TableHead>
                      )}
                      {selectedRequest.status !== "PENDING" && (
                        <TableHead>Approved</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRequest.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>{item.item_unit}</TableCell>
                        <TableCell>
                          <span className={cn(
                            item.current_stock < item.quantity_requested && "text-destructive font-medium"
                          )}>
                            {item.current_stock}
                          </span>
                        </TableCell>
                        <TableCell>{item.quantity_requested}</TableCell>
                        {selectedRequest.status === "PENDING" ? (
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={item.quantity_requested}
                              className="h-8 w-24"
                              value={approvalQuantities[item.item_id] ?? 0}
                              onChange={(e) =>
                                setApprovalQuantities((prev) => ({
                                  ...prev,
                                  [item.item_id]: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </TableCell>
                        ) : (
                          <TableCell>
                            {item.quantity_approved ?? "—"}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              {selectedRequest?.status === "PENDING" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => rejectMutation.mutate(selectedRequest.id)}
                    disabled={rejectMutation.isPending}
                  >
                    {rejectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    {approveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve
                  </Button>
                </>
              )}
              {(selectedRequest?.status === "APPROVED" || selectedRequest?.status === "PARTIALLY_APPROVED") && (
                <Button
                  onClick={() => fulfillMutation.mutate(selectedRequest.id)}
                  disabled={fulfillMutation.isPending}
                >
                  {fulfillMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <PackageCheck className="mr-2 h-4 w-4" />
                  Fulfill (Issue Stock)
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

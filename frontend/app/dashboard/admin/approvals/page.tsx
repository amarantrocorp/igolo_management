"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { ApprovalLog } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  Loader2,
  ShieldCheck,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export default function ApprovalsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [actionOpen, setActionOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ApprovalLog | null>(null)
  const [comments, setComments] = useState("")

  const { data: pendingApprovals = [], isLoading } = useQuery<ApprovalLog[]>({
    queryKey: ["pending-approvals"],
    queryFn: async () => {
      const res = await api.get("/approvals/pending")
      return res.data.items ?? res.data
    },
  })

  const processMutation = useMutation({
    mutationFn: async ({ logId, status }: { logId: string; status: string }) => {
      await api.patch(`/approvals/${logId}`, { status, comments: comments || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] })
      setActionOpen(false)
      setSelectedLog(null)
      setComments("")
      toast({ title: "Approval processed" })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  function openAction(log: ApprovalLog) {
    setSelectedLog(log)
    setComments("")
    setActionOpen(true)
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={ShieldCheck}
          title="Approvals"
          subtitle="Review and process pending approval requests"
          gradient="linear-gradient(135deg, #EC4899, #DB2777)"
        />

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entity Type</TableHead>
                <TableHead>Entity ID</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Required Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
              ) : pendingApprovals.length > 0 ? (
                pendingApprovals.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openAction(log)}>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{log.entity_id.slice(0, 8)}</TableCell>
                    <TableCell>{log.level}</TableCell>
                    <TableCell>{log.required_role}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", STATUS_COLORS[log.status])}>{log.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(log.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => processMutation.mutate({ logId: log.id, status: "APPROVED" })}
                          disabled={processMutation.isPending}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5 text-green-600" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(log)}
                        >
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No pending approvals</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action Dialog */}
        <Dialog open={actionOpen} onOpenChange={setActionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Approval</DialogTitle>
              <DialogDescription>
                {selectedLog?.entity_type} — Entity {selectedLog?.entity_id.slice(0, 8)} (Level {selectedLog?.level})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Comments (Optional)</label>
                <Input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add a comment..." />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => selectedLog && processMutation.mutate({ logId: selectedLog.id, status: "REJECTED" })}
                disabled={processMutation.isPending}
              >
                {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reject
              </Button>
              <Button
                onClick={() => selectedLog && processMutation.mutate({ logId: selectedLog.id, status: "APPROVED" })}
                disabled={processMutation.isPending}
              >
                {processMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

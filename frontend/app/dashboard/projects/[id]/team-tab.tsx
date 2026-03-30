"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Trash2, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuthStore } from "@/store/auth-store"
import type { ProjectAssignment } from "@/types"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface TeamTabProps {
  projectId: string
}

const roleBadgeVariant = (role: string) => {
  switch (role) {
    case "MANAGER":
      return "default"
    case "SUPERVISOR":
      return "secondary"
    case "BDE":
      return "outline"
    case "SALES":
      return "outline"
    default:
      return "outline"
  }
}

export default function TeamTab({ projectId }: TeamTabProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const roleInOrg = useAuthStore((s) => s.roleInOrg)
  const canManageTeam =
    roleInOrg === "SUPER_ADMIN" || roleInOrg === "MANAGER"

  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  // Fetch team assignments
  const { data: assignments = [], isLoading } = useQuery<ProjectAssignment[]>({
    queryKey: ["project-assignments", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/assignments`)
      return res.data
    },
  })

  // Fetch org users for the assign dialog
  const { data: orgUsers = [], isLoading: usersLoading } = useQuery<
    { id: string; full_name: string; email: string; role: string }[]
  >({
    queryKey: ["org-users"],
    queryFn: async () => {
      const res = await api.get("/users?limit=100")
      // The API may return paginated or flat list
      return res.data.items ?? res.data
    },
    enabled: assignDialogOpen,
  })

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (payload: { user_id: string; role: string }) => {
      return api.post(`/projects/${projectId}/assignments`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-assignments", projectId],
      })
      toast({ title: "Member assigned successfully" })
      setAssignDialogOpen(false)
      setSelectedUserId("")
    },
    onError: (err: any) => {
      toast({
        title: "Failed to assign member",
        description: err?.response?.data?.detail || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/projects/${projectId}/assignments/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-assignments", projectId],
      })
      toast({ title: "Member removed from project" })
      setConfirmRemoveId(null)
    },
    onError: (err: any) => {
      toast({
        title: "Failed to remove member",
        description: err?.response?.data?.detail || "Something went wrong",
        variant: "destructive",
      })
    },
  })

  // Derive role from selected user
  const selectedUser = orgUsers.find((u) => u.id === selectedUserId)
  const selectedRole = selectedUser?.role ?? ""

  const handleAssign = () => {
    if (!selectedUserId || !selectedRole) return
    assignMutation.mutate({ user_id: selectedUserId, role: selectedRole })
  }

  // Filter out already-assigned users from the selection list
  const assignedUserIds = new Set(assignments.map((a) => a.user_id))
  const availableUsers = orgUsers.filter((u) => !assignedUserIds.has(u.id))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Team Members</CardTitle>
        {canManageTeam && (
          <Button size="sm" onClick={() => setAssignDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team members assigned
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
                {canManageTeam && (
                  <TableHead className="w-[80px]">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">
                    {assignment.user_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {assignment.user_email}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(assignment.role)}>
                      {assignment.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(assignment.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {canManageTeam && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setConfirmRemoveId(assignment.user_id)
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Assign Member Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              {usersLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading users...
                </div>
              ) : (
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedUser && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50">
                  <Badge variant={roleBadgeVariant(selectedRole)}>
                    {selectedRole}
                  </Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={
                !selectedUserId ||
                !selectedRole ||
                assignMutation.isPending
              }
            >
              {assignMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <Dialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => !open && setConfirmRemoveId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to remove this member from the project? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRemoveId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemoveId && removeMutation.mutate(confirmRemoveId)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import api from "@/lib/api"
import type { Sprint } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  CheckCircle2,
  Clock,
  Circle,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const SPRINT_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DELAYED", label: "Delayed" },
]

const sprintUpdateSchema = z.object({
  status: z.string().optional(),
  end_date: z.string().optional(),
  completion_percentage: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
})

type SprintUpdateForm = z.infer<typeof sprintUpdateSchema>

function getSprintIcon(status: string) {
  if (status === "COMPLETED")
    return <CheckCircle2 className="h-5 w-5 text-green-600" />
  if (status === "ACTIVE" || status === "IN_PROGRESS")
    return <Clock className="h-5 w-5 text-blue-600" />
  if (status === "DELAYED")
    return <AlertTriangle className="h-5 w-5 text-red-600" />
  return <Circle className="h-5 w-5 text-gray-300" />
}

function getSprintBadge(status: string) {
  if (status === "COMPLETED")
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
        Completed
      </Badge>
    )
  if (status === "ACTIVE" || status === "IN_PROGRESS")
    return (
      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
        Active
      </Badge>
    )
  if (status === "DELAYED")
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
        Delayed
      </Badge>
    )
  return (
    <Badge variant="secondary" className="text-gray-500">
      Pending
    </Badge>
  )
}

function formatSprintDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

export default function SprintsTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const form = useForm<SprintUpdateForm>({
    resolver: zodResolver(sprintUpdateSchema),
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      sprintId,
      data,
    }: {
      sprintId: string
      data: SprintUpdateForm
    }) => {
      // Build payload with only defined fields
      const payload: Record<string, unknown> = {}
      if (data.status) payload.status = data.status
      if (data.end_date) payload.end_date = data.end_date
      if (data.completion_percentage !== undefined && data.completion_percentage !== null)
        payload.completion_percentage = data.completion_percentage
      if (data.notes) payload.notes = data.notes

      const res = await api.patch(
        `/projects/${projectId}/sprints/${sprintId}`,
        payload
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setEditOpen(false)
      setSelectedSprint(null)
      form.reset()
      toast({
        title: "Sprint updated",
        description: "Sprint has been updated successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sprint. Please try again.",
        variant: "destructive",
      })
    },
  })

  function openEditDialog(sprint: Sprint) {
    setSelectedSprint(sprint)
    form.reset({
      status: sprint.status,
      end_date: sprint.end_date ? sprint.end_date.slice(0, 10) : "",
      completion_percentage: sprint.completion_percentage ?? 0,
      notes: "",
    })
    setEditOpen(true)
  }

  const sortedSprints = [...sprints].sort(
    (a, b) => a.sequence_order - b.sequence_order
  )

  if (sprints.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
        No sprints found for this project.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-5 text-lg font-semibold">Sprint Timeline</h2>
        <div className="space-y-0">
          {sortedSprints.map((sprint, idx) => (
            <div
              key={sprint.id}
              className="flex cursor-pointer gap-4 transition-colors hover:bg-gray-50 rounded-lg -mx-2 px-2"
              onClick={() => openEditDialog(sprint)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openEditDialog(sprint)
              }}
            >
              {/* Vertical line + icon */}
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  {getSprintIcon(sprint.status)}
                </div>
                {idx < sortedSprints.length - 1 && (
                  <div
                    className={`w-0.5 flex-1 ${
                      sprint.status === "COMPLETED"
                        ? "bg-green-200"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-medium">{sprint.name}</span>
                  {getSprintBadge(sprint.status)}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    {formatSprintDate(sprint.start_date)} -{" "}
                    {formatSprintDate(sprint.end_date)}
                  </span>
                </div>
                {(sprint.status === "ACTIVE" ||
                  sprint.status === ("IN_PROGRESS" as string)) &&
                  sprint.completion_percentage != null && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 max-w-xs rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${sprint.completion_percentage}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {sprint.completion_percentage}%
                      </span>
                    </div>
                  )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Sprint Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sprint</DialogTitle>
            <DialogDescription>
              {selectedSprint?.name ?? "Update sprint details"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((data) => {
              if (!selectedSprint) return
              updateMutation.mutate({ sprintId: selectedSprint.id, data })
            })}
          >
            <div className="space-y-4 py-4">
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.watch("status") ?? ""}
                  onValueChange={(v) => form.setValue("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPRINT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" {...form.register("end_date")} />
                <p className="flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  Changing end date will automatically shift all dependent sprints
                </p>
              </div>

              {/* Completion Percentage */}
              <div className="space-y-2">
                <Label>Completion Percentage</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0-100"
                  {...form.register("completion_percentage")}
                />
                {form.formState.errors.completion_percentage && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.completion_percentage.message}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add any notes about this sprint update..."
                  {...form.register("notes")}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

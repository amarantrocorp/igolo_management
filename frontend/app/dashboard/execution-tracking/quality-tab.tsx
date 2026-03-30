"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import api from "@/lib/api"
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
import { Plus, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import type { Sprint, SnagItem, Inspection } from "@/types"

const SEVERITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
]

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
}

const SNAG_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  VERIFIED: "bg-gray-100 text-gray-700",
}

const INSPECTION_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
}

const NEXT_SNAG_STATUS: Record<string, string> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "RESOLVED",
}

const createSnagSchema = z.object({
  description: z.string().min(1, "Description is required"),
  severity: z.string().min(1, "Severity is required"),
  sprint_id: z.string().optional(),
  photo_url: z.string().nullable().optional(),
  due_date: z.string().optional(),
})

type CreateSnagForm = z.infer<typeof createSnagSchema>

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-700"
  if (score >= 60) return "text-yellow-700"
  return "text-red-700"
}

export default function QualityTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // --- Queries ---

  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery<
    Inspection[]
  >({
    queryKey: ["quality-inspections", projectId],
    queryFn: async () => {
      const res = await api.get("/quality/inspections", {
        params: { project_id: projectId },
      })
      return res.data.items ?? res.data
    },
  })

  const { data: snags = [], isLoading: snagsLoading } = useQuery<SnagItem[]>({
    queryKey: ["quality-snags", projectId],
    queryFn: async () => {
      const res = await api.get("/quality/snags", {
        params: { project_id: projectId },
      })
      return res.data.items ?? res.data
    },
  })

  // --- Mutations ---

  const createSnagMutation = useMutation({
    mutationFn: async (data: CreateSnagForm) => {
      const payload = {
        project_id: projectId,
        sprint_id: data.sprint_id || null,
        description: data.description,
        severity: data.severity,
        photo_url: data.photo_url || null,
        due_date: data.due_date || null,
      }
      const res = await api.post("/quality/snags", payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-snags", projectId] })
      setCreateOpen(false)
      form.reset()
      toast({
        title: "Snag reported",
        description: "New snag has been logged successfully.",
      })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to report snag.",
        variant: "destructive",
      })
    },
  })

  const updateSnagStatusMutation = useMutation({
    mutationFn: async ({
      snagId,
      status,
    }: {
      snagId: string
      status: string
    }) => {
      await api.patch(`/quality/snags/${snagId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-snags", projectId] })
      toast({ title: "Snag updated" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to update snag.",
        variant: "destructive",
      })
    },
  })

  // --- Form ---

  const form = useForm<CreateSnagForm>({
    resolver: zodResolver(createSnagSchema),
    defaultValues: {
      description: "",
      severity: "",
      sprint_id: undefined,
      photo_url: null,
      due_date: "",
    },
  })

  // --- Render ---

  return (
    <div className="space-y-8">
      {/* Inspections Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Inspections</h3>

        {inspectionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="rounded-xl border bg-white p-5 text-center">
            <p className="text-muted-foreground">No inspections yet</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {inspections.map((inspection) => (
              <div
                key={inspection.id}
                className="rounded-xl border bg-white p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{inspection.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(inspection.inspection_date).toLocaleDateString(
                        "en-IN",
                        { day: "2-digit", month: "short", year: "numeric" },
                      )}
                      {" \u00B7 "}
                      {inspection.inspector_name}
                    </p>
                  </div>
                  <Badge
                    className={INSPECTION_STATUS_COLORS[inspection.status]}
                  >
                    {inspection.status.replace("_", " ")}
                  </Badge>
                </div>

                {inspection.status === "COMPLETED" &&
                  inspection.overall_score != null && (
                    <p
                      className={`text-sm font-semibold ${getScoreColor(inspection.overall_score)}`}
                    >
                      Score: {inspection.overall_score}%
                    </p>
                  )}

                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {inspection.pass_count} Pass
                  </span>
                  <span className="flex items-center gap-1 text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    {inspection.fail_count} Fail
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snags Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Snags</h3>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Report Snag
          </Button>
        </div>

        {snagsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : snags.length === 0 ? (
          <div className="rounded-xl border bg-white p-5 text-center">
            <p className="text-muted-foreground">No snags reported</p>
          </div>
        ) : (
          <div className="space-y-3">
            {snags.map((snag) => (
              <div
                key={snag.id}
                className="rounded-xl border bg-white p-5 flex items-start justify-between gap-4"
              >
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{snag.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={SEVERITY_COLORS[snag.severity]}>
                      {snag.severity}
                    </Badge>
                    <Badge className={SNAG_STATUS_COLORS[snag.status]}>
                      {snag.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    {snag.assigned_to_name && (
                      <span>Assigned: {snag.assigned_to_name}</span>
                    )}
                    {snag.due_date && (
                      <span>
                        Due:{" "}
                        {new Date(snag.due_date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {NEXT_SNAG_STATUS[snag.status] && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={updateSnagStatusMutation.isPending}
                    onClick={() =>
                      updateSnagStatusMutation.mutate({
                        snagId: snag.id,
                        status: NEXT_SNAG_STATUS[snag.status],
                      })
                    }
                  >
                    {updateSnagStatusMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : snag.status === "OPEN" ? (
                      "Start"
                    ) : (
                      "Resolve"
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Snag Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Snag</DialogTitle>
            <DialogDescription>
              Log a new quality issue or defect for this project.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((data) =>
              createSnagMutation.mutate(data),
            )}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the snag or defect..."
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Severity *</Label>
                  <Select
                    value={form.watch("severity")}
                    onValueChange={(v) => form.setValue("severity", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.severity && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.severity.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sprint (optional)</Label>
                  <Select
                    value={form.watch("sprint_id") ?? ""}
                    onValueChange={(v) =>
                      form.setValue("sprint_id", v === "none" ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sprints.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date (optional)</Label>
                <Input type="date" {...form.register("due_date")} />
              </div>

              <FileUpload
                value={form.watch("photo_url")}
                onChange={(url) => form.setValue("photo_url", url)}
                category="daily-logs"
                label="Photo (optional)"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createSnagMutation.isPending}>
                {createSnagMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Report Snag
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

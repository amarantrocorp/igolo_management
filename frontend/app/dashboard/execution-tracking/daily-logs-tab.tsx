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
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Calendar,
  FileText,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { MultiFileUpload } from "@/components/ui/multi-file-upload"
import type { Sprint, DailyLog } from "@/types"

const dailyLogSchema = z.object({
  sprint_id: z.string().min(1, "Sprint is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().min(1, "Notes are required"),
  blockers: z.string().optional(),
  visible_to_client: z.boolean(),
})

type DailyLogFormValues = z.infer<typeof dailyLogSchema>

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getSprintBorderColor(status?: string): string {
  switch (status) {
    case "ACTIVE":
      return "border-l-blue-500"
    case "COMPLETED":
      return "border-l-green-500"
    case "DELAYED":
      return "border-l-red-500"
    default:
      return "border-l-gray-300"
  }
}

export default function DailyLogsTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [filterSprintId, setFilterSprintId] = useState<string>("all")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    data: logs = [],
    isLoading,
  } = useQuery<DailyLog[]>({
    queryKey: ["project-daily-logs", projectId, filterSprintId],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filterSprintId && filterSprintId !== "all") {
        params.sprint_id = filterSprintId
      }
      const response = await api.get(`/projects/${projectId}/daily-logs`, { params })
      return response.data.items ?? response.data
    },
  })

  const sortedLogs = [...logs].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.created_at.localeCompare(a.created_at)
  })

  const form = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: {
      sprint_id: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
      blockers: "",
      visible_to_client: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: DailyLogFormValues) => {
      const payload = {
        sprint_id: data.sprint_id,
        date: data.date,
        notes: data.notes,
        blockers: data.blockers || null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        visible_to_client: data.visible_to_client,
      }
      const response = await api.post(`/projects/${projectId}/daily-logs`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-daily-logs", projectId] })
      setCreateOpen(false)
      form.reset()
      setImageUrls([])
      toast({ title: "Daily log added", description: "The daily log has been recorded." })
    },
    onError: (error: unknown) => {
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to create daily log."
      toast({
        title: "Error",
        description: detail,
        variant: "destructive",
      })
    },
  })

  function getSprintName(sprintId: string): string {
    const sprint = sprints.find((s) => s.id === sprintId)
    return sprint?.name ?? "Unknown Sprint"
  }

  function getSprintStatus(sprintId: string): string | undefined {
    return sprints.find((s) => s.id === sprintId)?.status
  }

  function getLogImages(log: DailyLog): string[] {
    return log.image_urls ?? log.images ?? []
  }

  return (
    <div className="space-y-5">
      {/* Header row: filter + add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-64">
          <Select value={filterSprintId} onValueChange={setFilterSprintId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Sprint" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sprints</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Daily Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Daily Log</DialogTitle>
              <DialogDescription>
                Record today's progress, issues, and site photos.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
              <div className="space-y-4 py-4">
                {/* Sprint */}
                <div className="space-y-2">
                  <Label>Sprint *</Label>
                  <Select
                    value={form.watch("sprint_id")}
                    onValueChange={(v) => form.setValue("sprint_id", v, { shouldValidate: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.sprint_id && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.sprint_id.message}
                    </p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" {...form.register("date")} />
                  {form.formState.errors.date && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.date.message}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes *</Label>
                  <Textarea
                    placeholder="What was completed today?"
                    rows={3}
                    {...form.register("notes")}
                  />
                  {form.formState.errors.notes && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.notes.message}
                    </p>
                  )}
                </div>

                {/* Blockers */}
                <div className="space-y-2">
                  <Label>Blockers</Label>
                  <Textarea
                    placeholder="Any blockers or issues?"
                    rows={2}
                    {...form.register("blockers")}
                  />
                </div>

                {/* Photos */}
                <div className="space-y-2">
                  <MultiFileUpload
                    value={imageUrls}
                    onChange={setImageUrls}
                    category="daily-logs"
                    maxFiles={5}
                    label="Site Photos"
                  />
                </div>

                {/* Visible to Client */}
                <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium">Visible to Client</span>
                    <p className="text-xs text-muted-foreground">
                      Allow the client to see this log entry
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.watch("visible_to_client")}
                    onChange={(e) =>
                      form.setValue("visible_to_client", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </label>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateOpen(false)
                    form.reset()
                    setImageUrls([])
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Log
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Logs Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sortedLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No daily logs yet</p>
          <p className="text-sm text-muted-foreground">
            Start logging daily progress to keep everyone updated.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedLogs.map((log) => {
            const images = getLogImages(log)
            const sprintStatus = getSprintStatus(log.sprint_id)

            return (
              <div
                key={log.id}
                className={`rounded-xl border border-l-4 bg-white p-5 ${getSprintBorderColor(sprintStatus)}`}
              >
                {/* Header: date, sprint, visibility badge */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(log.date)}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getSprintName(log.sprint_id)}
                  </Badge>
                  {log.visible_to_client ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                      <Eye className="mr-1 h-3 w-3" />
                      Client Visible
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <EyeOff className="mr-1 h-3 w-3" />
                      Internal
                    </Badge>
                  )}
                </div>

                {/* Notes */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {log.notes}
                </p>

                {/* Blockers */}
                {log.blockers && log.blockers.trim() !== "" && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div>
                      <p className="text-xs font-medium text-red-700">Blockers</p>
                      <p className="text-sm text-red-600 whitespace-pre-wrap">
                        {log.blockers}
                      </p>
                    </div>
                  </div>
                )}

                {/* Images */}
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Site photo ${index + 1}`}
                          className="h-16 w-16 rounded-lg border object-cover transition-opacity hover:opacity-80"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {/* Footer: logged by */}
                <div className="mt-3 text-xs text-muted-foreground">
                  Logged by: {log.logged_by_id?.substring(0, 8) ?? log.created_by?.substring(0, 8) ?? "---"}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

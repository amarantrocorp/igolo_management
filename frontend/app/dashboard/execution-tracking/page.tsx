"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Truck,
  ClipboardCheck,
  CalendarCheck,
  AlertCircle,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  Circle,
  User,
  Flag,
  X,
  Loader2,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"

function getSprintIcon(status: string) {
  if (status === "COMPLETED") return <CheckCircle2 className="h-5 w-5 text-green-600" />
  if (status === "ACTIVE") return <Clock className="h-5 w-5 text-blue-600" />
  return <Circle className="h-5 w-5 text-gray-300" />
}

function getSprintBadge(status: string) {
  if (status === "COMPLETED")
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
  if (status === "ACTIVE")
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">In Progress</Badge>
  if (status === "DELAYED")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Delayed</Badge>
  return <Badge variant="secondary" className="text-gray-500">Upcoming</Badge>
}

function formatSprintDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function ExecutionTrackingPage() {
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0)
  const [showLogForm, setShowLogForm] = useState(false)

  // Daily Log form state
  const [logSprint, setLogSprint] = useState("")
  const [logDescription, setLogDescription] = useState("")
  const [logProgress, setLogProgress] = useState("")
  const [logPhotos, setLogPhotos] = useState("")

  const { data: projects = [], isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects?limit=20")
      return res.data
    },
  })

  // Compute stats from real project data
  const stats = useMemo(() => {
    const activeProjects = projects.filter((p: any) => p.status === "IN_PROGRESS").length
    const completedSprints = projects.reduce((acc: number, p: any) => {
      return acc + (p.sprints?.filter((s: any) => s.status === "COMPLETED")?.length || 0)
    }, 0)
    const totalSprints = projects.reduce((acc: number, p: any) => {
      return acc + (p.sprints?.length || 0)
    }, 0)
    const onSchedule = projects.filter((p: any) => {
      const hasDelayed = p.sprints?.some((s: any) => s.status === "DELAYED")
      return p.status === "IN_PROGRESS" && !hasDelayed
    }).length
    const delayed = projects.filter((p: any) => {
      return p.sprints?.some((s: any) => s.status === "DELAYED")
    }).length

    return { activeProjects, completedSprints, totalSprints, onSchedule, delayed }
  }, [projects])

  const selectedProject = projects[selectedProjectIdx] || null

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Execution Tracking</h1>
            <p className="text-muted-foreground">
              Monitor on-site execution progress and milestones
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!selectedProject} onClick={() => {
              if (!selectedProject) return
              const headers = ["Sprint", "Status", "Start Date", "End Date", "Completion %"]
              const sprintRows = (selectedProject.sprints || []).map((s: any) => [
                s.name,
                s.status,
                s.start_date,
                s.end_date,
                `${s.completion_percentage || 0}%`,
              ])
              exportCSV(`${selectedProject.name}-report.csv`, headers, sprintRows)
              toast({ title: "Report exported", description: `${selectedProject.name} report exported as CSV` })
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button onClick={() => setShowLogForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Daily Log
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Sites</p>
                <p className="text-2xl font-bold">{isLoading ? "-" : stats.activeProjects}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-50">
                <ClipboardCheck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sprints Completed</p>
                <p className="text-2xl font-bold">{isLoading ? "-" : stats.completedSprints}</p>
                <p className="text-xs text-muted-foreground">{isLoading ? "" : `of ${stats.totalSprints} total`}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                <CalendarCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On-Schedule</p>
                <p className="text-2xl font-bold">{isLoading ? "-" : `${stats.onSchedule} project${stats.onSchedule !== 1 ? "s" : ""}`}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delayed</p>
                <p className="text-2xl font-bold">{isLoading ? "-" : `${stats.delayed} project${stats.delayed !== 1 ? "s" : ""}`}</p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-muted-foreground">
            Failed to load projects. Please try again.
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
            No active projects. Create your first project to start tracking.
          </div>
        ) : (
          <>
            {/* Project Selector */}
            <div className="flex flex-wrap gap-2">
              {projects.map((p: any, idx: number) => (
                <Button
                  key={p.id}
                  variant={selectedProjectIdx === idx ? "default" : "outline"}
                  onClick={() => setSelectedProjectIdx(idx)}
                  size="sm"
                >
                  {p.name}
                </Button>
              ))}
            </div>

            {/* Daily Log Form */}
            {showLogForm && selectedProject && (
              <div className="rounded-xl border bg-white p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Add Daily Log</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowLogForm(false)}><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Sprint</Label>
                    <Select value={logSprint} onValueChange={setLogSprint}>
                      <SelectTrigger><SelectValue placeholder="Select sprint" /></SelectTrigger>
                      <SelectContent>
                        {(selectedProject.sprints || []).map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input placeholder="What was completed today?" value={logDescription} onChange={(e) => setLogDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Progress %</Label>
                    <Input type="number" placeholder="65" min="0" max="100" value={logProgress} onChange={(e) => {
                      const val = Math.min(100, Math.max(0, Number(e.target.value)))
                      setLogProgress(e.target.value === "" ? "" : String(val))
                    }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo Notes</Label>
                    <Input placeholder="Photo references or notes" value={logPhotos} onChange={(e) => setLogPhotos(e.target.value)} />
                  </div>
                </div>
                <Button onClick={async () => {
                  if (!logSprint) { toast({ title: "Missing fields", description: "Please select a sprint." }); return }
                  if (!logDescription.trim()) { toast({ title: "Missing fields", description: "Description is required" }); return }
                  if (logProgress && (Number(logProgress) < 0 || Number(logProgress) > 100)) { toast({ title: "Invalid", description: "Progress must be between 0 and 100" }); return }
                  try {
                    await api.post(`/projects/${selectedProject.id}/daily-logs`, {
                      sprint_id: logSprint,
                      notes: logDescription,
                      visible_to_client: true,
                    })
                    toast({ title: "Daily log added", description: logDescription })
                    setLogSprint(""); setLogDescription(""); setLogProgress(""); setLogPhotos(""); setShowLogForm(false)
                  } catch {
                    toast({ title: "Error", description: "Failed to save daily log", variant: "destructive" })
                  }
                }}>Save Log</Button>
              </div>
            )}

            {/* Sprint Timeline */}
            {selectedProject && (
              <div className="rounded-xl border bg-white p-6">
                <h2 className="mb-5 text-lg font-semibold">Sprint / Phase Timeline</h2>
                {(selectedProject.sprints || []).length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No sprints found for this project.</p>
                ) : (
                  <div className="space-y-0">
                    {(selectedProject.sprints || [])
                      .sort((a: any, b: any) => a.sequence_order - b.sequence_order)
                      .map((sprint: any, idx: number, arr: any[]) => (
                      <div key={sprint.id} className="flex gap-4">
                        {/* Vertical line + icon */}
                        <div className="flex flex-col items-center">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                            {getSprintIcon(sprint.status)}
                          </div>
                          {idx < arr.length - 1 && (
                            <div
                              className={`w-0.5 flex-1 ${
                                sprint.status === "COMPLETED" ? "bg-green-200" : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                            <span className="font-medium">
                              {sprint.name}
                            </span>
                            {getSprintBadge(sprint.status)}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{formatSprintDate(sprint.start_date)} - {formatSprintDate(sprint.end_date)}</span>
                          </div>
                          {sprint.status === "ACTIVE" && sprint.completion_percentage != null && (
                            <div className="mt-2 flex items-center gap-3">
                              <div className="h-2 flex-1 max-w-xs rounded-full bg-gray-100">
                                <div
                                  className="h-2 rounded-full bg-blue-600 transition-all"
                                  style={{ width: `${sprint.completion_percentage}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-blue-600">{sprint.completion_percentage}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Today's Activities */}
              <div className="rounded-xl border bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold">Today&apos;s Activities</h2>
                <div className="py-6 text-center text-muted-foreground">
                  No activities logged today.
                </div>
              </div>

              {/* Site Issues */}
              <div className="rounded-xl border bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold">Site Issues</h2>
                <div className="py-6 text-center text-muted-foreground">
                  No open issues.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </RoleGuard>
  )
}

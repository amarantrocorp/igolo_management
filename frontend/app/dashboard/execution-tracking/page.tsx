"use client"

import { useState, useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { Project, Sprint } from "@/types"
import {
  Loader2,
  Truck,
  ClipboardCheck,
  AlertCircle,
  CalendarCheck,
} from "lucide-react"
import SprintsTab from "./sprints-tab"
import DailyLogsTab from "./daily-logs-tab"
import QualityTab from "./quality-tab"
import VariationOrdersTab from "./variation-orders-tab"

export default function ExecutionTrackingPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")

  // Fetch all projects
  const {
    data: projects = [],
    isLoading: projectsLoading,
  } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get("/projects?limit=50")
      return res.data.items ?? res.data
    },
  })

  // Default to first project once loaded
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, selectedProjectId])

  // Fetch selected project detail
  const {
    data: project,
    isLoading: projectLoading,
  } = useQuery<Project>({
    queryKey: ["project", selectedProjectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${selectedProjectId}`)
      return res.data
    },
    enabled: !!selectedProjectId,
  })

  // Fetch open snags count
  const { data: snagsData } = useQuery({
    queryKey: ["snags", selectedProjectId, "OPEN"],
    queryFn: async () => {
      const res = await api.get(`/quality/snags?project_id=${selectedProjectId}&status=OPEN`)
      const data = res.data
      if (Array.isArray(data)) return data.length
      if (data.items) return data.items.length
      if (typeof data.total === "number") return data.total
      return 0
    },
    enabled: !!selectedProjectId,
  })

  // Fetch daily logs count
  const { data: dailyLogsData } = useQuery({
    queryKey: ["daily-logs-count", selectedProjectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${selectedProjectId}/daily-logs`)
      const data = res.data
      if (Array.isArray(data)) return data.length
      if (data.items) return data.items.length
      if (typeof data.total === "number") return data.total
      return 0
    },
    enabled: !!selectedProjectId,
  })

  const sprints: Sprint[] = project?.sprints ?? []

  // Compute summary stats
  const activeSprint = useMemo(() => {
    return sprints.find(
      (s) => s.status === "ACTIVE" || s.status === ("IN_PROGRESS" as string)
    )
  }, [sprints])

  const overallCompletion = useMemo(() => {
    if (sprints.length === 0) return 0
    const total = sprints.reduce((acc, s) => acc + (s.completion_percentage ?? 0), 0)
    return Math.round(total / sprints.length)
  }, [sprints])

  const openSnags = snagsData ?? 0
  const dailyLogsCount = dailyLogsData ?? 0

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
          <div className="w-full sm:w-72">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.client?.lead?.name ?? p.client?.user?.full_name ?? `Project ${p.id.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading / Empty */}
        {projectsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">
            No projects found. Create your first project to start tracking.
          </div>
        ) : projectLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Active Sprint */}
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">Active Sprint</p>
                    <p className="truncate text-lg font-bold">
                      {activeSprint ? activeSprint.name : "None"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overall Completion */}
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-50">
                    <ClipboardCheck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Completion</p>
                    <p className="text-2xl font-bold">{overallCompletion}%</p>
                  </div>
                </div>
              </div>

              {/* Open Snags */}
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Open Snags</p>
                    <p className="text-2xl font-bold">{openSnags}</p>
                  </div>
                </div>
              </div>

              {/* Daily Logs */}
              <div className="rounded-xl border bg-white p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <CalendarCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Logs</p>
                    <p className="text-2xl font-bold">{dailyLogsCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="sprints" className="space-y-4">
              <TabsList>
                <TabsTrigger value="sprints">Sprints</TabsTrigger>
                <TabsTrigger value="daily-logs">Daily Logs</TabsTrigger>
                <TabsTrigger value="quality">Quality</TabsTrigger>
                <TabsTrigger value="variation-orders">Variation Orders</TabsTrigger>
              </TabsList>

              <TabsContent value="sprints">
                <SprintsTab projectId={selectedProjectId} sprints={sprints} />
              </TabsContent>

              <TabsContent value="daily-logs">
                <DailyLogsTab projectId={selectedProjectId} sprints={sprints} />
              </TabsContent>

              <TabsContent value="quality">
                <QualityTab projectId={selectedProjectId} sprints={sprints} />
              </TabsContent>

              <TabsContent value="variation-orders">
                <VariationOrdersTab projectId={selectedProjectId} sprints={sprints} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </RoleGuard>
  )
}

"use client"

import { useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type {
  Project,
  Sprint,
  SprintStatus,
  Transaction,
  DailyLog,
  VariationOrder,
  ProjectWallet,
  VOStatus,
  AttendanceLog,
  LaborTeam,
  AttendanceStatus,
  ProjectMaterials,
  Item,
  POStatus,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  ArrowLeft,
  Loader2,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Image as ImageIcon,
  AlertCircle,
  HardHat,
  Users,
  Package,
  Warehouse,
  XCircle,
  MapPin,
  Pencil,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import { MultiFileUpload } from "@/components/ui/multi-file-upload"
import { useAuthStore } from "@/store/auth-store"
import { cn, formatCurrency } from "@/lib/utils"
import { LocationPicker, LocationDisplay } from "@/components/ui/location-picker"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from "recharts"
import { BarChart3, List } from "lucide-react"
import TeamTab from "./team-tab"
import BOMTab from "./bom-tab"

// ---- Sprint Status helpers ----

function getSprintStatusBadge(status: SprintStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>
    case "ACTIVE":
      return <Badge variant="default">Active</Badge>
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>
    case "DELAYED":
      return <Badge variant="destructive">Delayed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getVOStatusBadge(status: VOStatus) {
  switch (status) {
    case "REQUESTED":
      return <Badge variant="warning">Requested</Badge>
    case "APPROVED":
      return <Badge variant="default">Approved</Badge>
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>
    case "PAID":
      return <Badge variant="success">Paid</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ---- Schema for recording payment ----
const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  source: z.enum(["CLIENT", "VENDOR", "LABOR", "PETTY_CASH"]),
  category: z.enum(["INFLOW", "OUTFLOW"]),
})

type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>

// ---- Schema for creating variation order ----
const createVOSchema = z.object({
  description: z.string().min(1, "Description is required"),
  additional_cost: z.coerce.number().min(0, "Cost must be positive"),
})

type CreateVOFormValues = z.infer<typeof createVOSchema>

// ---- Overview Tab ----

function OverviewTab({
  project,
  projectId,
}: {
  project: Project
  projectId: string
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const updateProjectMutation = useMutation({
    mutationFn: async (payload: { cover_image_url: string | null }) => {
      await api.patch(`/projects/${projectId}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({ title: "Project updated", description: "Cover image has been updated." })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project.", variant: "destructive" })
    },
  })
  const totalValue = Number(project.total_project_value ?? 0)
  const received = Number(project.wallet?.total_received ?? 0)
  const spent = Number(project.wallet?.total_spent ?? 0)
  const balance = received - spent
  const completedSprints =
    project.sprints?.filter((s) => s.status === "COMPLETED").length ?? 0
  const totalSprints = project.sprints?.length ?? 6
  const progressPercent = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0

  // Fetch labor cost breakdown from transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["project-transactions", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/transactions`)
      return response.data.items ?? response.data
    },
  })

  const laborCost = transactions
    .filter((t) => t.category === "OUTFLOW" && t.source === "LABOR")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  const materialCost = transactions
    .filter((t) => t.category === "OUTFLOW" && t.source === "VENDOR")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  const otherCost = transactions
    .filter(
      (t) =>
        t.category === "OUTFLOW" &&
        t.source !== "LABOR" &&
        t.source !== "VENDOR"
    )
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)

  const isOverdue = project.expected_end_date &&
    new Date(project.expected_end_date) < new Date() &&
    project.status !== "COMPLETED"

  return (
    <div className="space-y-6">
      {isOverdue && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          This project is overdue. Expected completion was {format(new Date(project.expected_end_date), "MMM d, yyyy")}.
        </div>
      )}
      {/* Project Details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                balance >= 0 ? "text-green-600" : "text-destructive"
              )}
            >
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Received - Spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.start_date
                ? format(new Date(project.start_date), "MMM d")
                : "TBD"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected End</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.expected_end_date
                ? format(new Date(project.expected_end_date), "MMM d")
                : "TBD"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Cover Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project Cover Image</CardTitle>
          <CardDescription>
            Upload a cover image for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUpload
            value={project?.cover_image_url || null}
            onChange={(url) => updateProjectMutation.mutate({ cover_image_url: url || null })}
            category="projects"
            accept="image/jpeg,image/png,image/webp"
            label="Project Cover Image"
          />
        </CardContent>
      </Card>

      {/* Project Location */}
      <ProjectLocationSection project={project} projectId={projectId} />

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
          <CardDescription>
            {completedSprints} of {totalSprints} sprints completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Completion</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-secondary">
            <div
              className="h-3 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(received)}
              </p>
              <p className="text-xs text-muted-foreground">Received</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(spent)}
              </p>
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p
                className={cn(
                  "text-2xl font-bold",
                  balance >= 0 ? "text-blue-600" : "text-destructive"
                )}
              >
                {formatCurrency(Math.abs(balance))}
              </p>
              <p className="text-xs text-muted-foreground">
                {balance >= 0 ? "Available" : "Over Budget"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {spent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Breakdown</CardTitle>
            <CardDescription>
              How expenses are distributed across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <HardHat className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-muted-foreground">Labor</span>
                </div>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(laborCost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spent > 0 ? Math.round((laborCost / spent) * 100) : 0}% of spend
                </p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-muted-foreground">Materials</span>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(materialCost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spent > 0 ? Math.round((materialCost / spent) * 100) : 0}% of spend
                </p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-muted-foreground">Other</span>
                </div>
                <p className="text-xl font-bold text-gray-600">
                  {formatCurrency(otherCost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spent > 0 ? Math.round((otherCost / spent) * 100) : 0}% of spend
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---- Project Location Section ----

function ProjectLocationSection({
  project,
  projectId,
}: {
  project: Project
  projectId: string
}) {
  const [editing, setEditing] = useState(false)
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const hasLocation =
    project.site_latitude != null &&
    project.site_longitude != null &&
    !isNaN(Number(project.site_latitude)) &&
    !isNaN(Number(project.site_longitude))

  const locationMutation = useMutation({
    mutationFn: async (payload: {
      site_latitude: number
      site_longitude: number
      site_address: string
    }) => {
      await api.patch(`/projects/${projectId}`, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({ title: "Location updated", description: "Project site location has been saved." })
      setEditing(false)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update project location.", variant: "destructive" })
    },
  })

  const handleLocationChange = (lat: number, lng: number, address: string) => {
    locationMutation.mutate({
      site_latitude: lat,
      site_longitude: lng,
      site_address: address,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Project Location</CardTitle>
          <CardDescription>
            {hasLocation ? "Site location for this project" : "No location set for this project"}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(!editing)}
        >
          {editing ? (
            <>
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Cancel
            </>
          ) : hasLocation ? (
            <>
              <Pencil className="mr-1 h-3.5 w-3.5" />
              Edit Location
            </>
          ) : (
            <>
              <MapPin className="mr-1 h-3.5 w-3.5" />
              Set Location
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {editing ? (
          <LocationPicker
            latitude={project.site_latitude ?? null}
            longitude={project.site_longitude ?? null}
            address={project.site_address ?? ""}
            onLocationChange={handleLocationChange}
            radiusMeters={project.geofence_radius_meters ?? 500}
          />
        ) : hasLocation ? (
          <LocationDisplay
            latitude={project.site_latitude ?? null}
            longitude={project.site_longitude ?? null}
            address={project.site_address}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Set Location&quot; to add the project site address
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---- Sprint Gantt Chart ----

const SPRINT_STATUS_COLORS: Record<string, string> = {
  PENDING: "#94a3b8",
  ACTIVE: "#3b82f6",
  COMPLETED: "#22c55e",
  DELAYED: "#ef4444",
}

interface GanttDatum {
  name: string
  startDay: number
  duration: number
  status: string
  completion: number
  fullName: string
  startDate: string
  endDate: string
}

function SprintGanttChart({
  sprints,
  projectStartDate,
}: {
  sprints: Sprint[]
  projectStartDate: string
}) {
  const projStart = new Date(projectStartDate)

  const ganttData: GanttDatum[] = sprints.map((sprint) => {
    const start = new Date(sprint.start_date)
    const end = new Date(sprint.end_date)
    const startDay = Math.max(
      0,
      Math.round((start.getTime() - projStart.getTime()) / (1000 * 60 * 60 * 24))
    )
    const duration = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    )
    return {
      name: sprint.name.replace(/^Sprint \d+:\s*/, ""),
      startDay,
      duration,
      status: sprint.status,
      completion: sprint.completion_percentage || 0,
      fullName: sprint.name,
      startDate: format(start, "MMM d, yyyy"),
      endDate: format(end, "MMM d, yyyy"),
    }
  })

  const CustomTooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null
    const data = payload[0]?.payload as GanttDatum | undefined
    if (!data) return null
    return (
      <div className="rounded-md border bg-popover p-3 text-sm shadow-md">
        <p className="font-medium">{data.fullName}</p>
        <p className="text-muted-foreground">
          {data.startDate} &mdash; {data.endDate}
        </p>
        <p className="text-muted-foreground">
          Completion: {data.completion}%
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: SPRINT_STATUS_COLORS[data.status] ?? "#94a3b8" }}
          />
          <span className="capitalize text-xs">{data.status.toLowerCase()}</span>
        </div>
      </div>
    )
  }

  const chartHeight = Math.max(200, ganttData.length * 48 + 40)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Sprint Timeline</CardTitle>
        <CardDescription>Gantt view of project sprints (days from project start)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={ganttData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            barSize={22}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" label={{ value: "Days", position: "insideBottom", offset: -2 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 12 }}
            />
            <RechartsTooltip content={<CustomTooltipContent />} />
            {/* Invisible spacer bar */}
            <Bar dataKey="startDay" stackId="a" fill="transparent" isAnimationActive={false} />
            {/* Visible duration bar */}
            <Bar dataKey="duration" stackId="a" radius={[4, 4, 4, 4]}>
              {ganttData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={SPRINT_STATUS_COLORS[entry.status] ?? "#94a3b8"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ---- Sprints Tab ----

function SprintsTab({
  sprints,
  projectId,
  projectStartDate,
}: {
  sprints: Sprint[]
  projectId: string
  projectStartDate: string
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [showGantt, setShowGantt] = useState(true)
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({})
  const progressTimers = useRef<Record<string, NodeJS.Timeout>>({})

  const updateSprintMutation = useMutation({
    mutationFn: async ({
      sprintId,
      status,
    }: {
      sprintId: string
      status: SprintStatus
    }) => {
      await api.patch(`/projects/${projectId}/sprints/${sprintId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({ title: "Sprint updated", description: "Sprint status has been updated." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sprint.",
        variant: "destructive",
      })
    },
  })

  const progressMutation = useMutation({
    mutationFn: ({ sprintId, value }: { sprintId: string; value: number }) =>
      api.patch(`/projects/${projectId}/sprints/${sprintId}`, { completion_percentage: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sprint progress.",
        variant: "destructive",
      })
    },
  })

  function handleProgressUpdate(sprintId: string, value: number) {
    setLocalProgress((prev) => ({ ...prev, [sprintId]: value }))
    if (progressTimers.current[sprintId]) clearTimeout(progressTimers.current[sprintId])
    progressTimers.current[sprintId] = setTimeout(() => {
      progressMutation.mutate({ sprintId, value })
    }, 500)
  }

  const sortedSprints = [...sprints].sort(
    (a, b) => a.sequence_order - b.sequence_order
  )

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showGantt ? "default" : "outline"}
          size="sm"
          onClick={() => setShowGantt(true)}
        >
          <BarChart3 className="h-4 w-4 mr-1.5" />
          Gantt View
        </Button>
        <Button
          variant={!showGantt ? "default" : "outline"}
          size="sm"
          onClick={() => setShowGantt(false)}
        >
          <List className="h-4 w-4 mr-1.5" />
          List View
        </Button>
      </div>

      {/* Gantt Chart */}
      {showGantt && sortedSprints.length > 0 && projectStartDate && (
        <SprintGanttChart sprints={sortedSprints} projectStartDate={projectStartDate} />
      )}

      {/* Sprint Cards (List View) */}
      {!showGantt && sortedSprints.map((sprint) => {
        const startDate = sprint.start_date
          ? format(new Date(sprint.start_date), "MMM d, yyyy")
          : "TBD"
        const endDate = sprint.end_date
          ? format(new Date(sprint.end_date), "MMM d, yyyy")
          : "TBD"

        const completionPct =
          localProgress[sprint.id] !== undefined
            ? localProgress[sprint.id]
            : sprint.completion_percentage || 0
        const progress =
          sprint.status === "COMPLETED"
            ? 100
            : sprint.status === "PENDING"
            ? 0
            : completionPct

        return (
          <Card
            key={sprint.id}
            className={cn(
              sprint.status === "ACTIVE" && "border-primary",
              sprint.status === "DELAYED" && "border-destructive"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                      sprint.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : sprint.status === "ACTIVE"
                        ? "bg-primary/10 text-primary"
                        : sprint.status === "DELAYED"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {sprint.sequence_order}
                  </div>
                  <div>
                    <p className="font-medium">{sprint.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {startDate} - {endDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getSprintStatusBadge(sprint.status)}
                  <Select
                    value={sprint.status}
                    onValueChange={(value) =>
                      updateSprintMutation.mutate({
                        sprintId: sprint.id,
                        status: value as SprintStatus,
                      })
                    }
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DELAYED">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      sprint.status === "COMPLETED"
                        ? "bg-green-500"
                        : sprint.status === "DELAYED"
                        ? "bg-red-500"
                        : sprint.status === "ACTIVE"
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Progress slider for ACTIVE and DELAYED sprints */}
                {(sprint.status === "ACTIVE" || sprint.status === "DELAYED") && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground w-8">
                      {completionPct}%
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={completionPct}
                      onChange={(e) =>
                        handleProgressUpdate(sprint.id, Number(e.target.value))
                      }
                      className="flex-1 h-2 accent-primary"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {sprints.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No sprints found</p>
          <p className="text-xs text-muted-foreground">
            Sprints are auto-generated when a project is created
          </p>
        </div>
      )}
    </div>
  )
}

// ---- Finance Tab ----

const SOURCE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  INFLOW: [{ value: "CLIENT", label: "Client" }],
  OUTFLOW: [
    { value: "VENDOR", label: "Vendor" },
    { value: "LABOR", label: "Labor" },
    { value: "PETTY_CASH", label: "Petty Cash" },
  ],
}

function FinanceTab({ projectId }: { projectId: string }) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canVerify = userRole === "MANAGER" || userRole === "SUPER_ADMIN"

  const { data: wallet } = useQuery<ProjectWallet>({
    queryKey: ["project-wallet", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/financial-health`)
      return response.data
    },
  })

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["project-transactions", projectId],
    queryFn: async () => {
      const response = await api.get(`/finance/projects/${projectId}/transactions`)
      return response.data.items ?? response.data
    },
  })

  const paymentForm = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: 0,
      description: "",
      source: "CLIENT",
      category: "INFLOW",
    },
  })

  const invalidateFinanceQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["project-wallet", projectId] })
    queryClient.invalidateQueries({
      queryKey: ["project-transactions", projectId],
    })
    queryClient.invalidateQueries({ queryKey: ["project", projectId] })
  }

  const paymentMutation = useMutation({
    mutationFn: async (data: RecordPaymentFormValues) => {
      await api.post(`/projects/${projectId}/transactions`, data)
    },
    onSuccess: () => {
      invalidateFinanceQueries()
      setPaymentOpen(false)
      paymentForm.reset()
      toast({
        title: "Transaction recorded",
        description: "Transaction has been recorded and is pending verification.",
      })
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      toast({
        title: "Error",
        description: detail || "Failed to record transaction.",
        variant: "destructive",
      })
    },
  })

  const verifyMutation = useMutation({
    mutationFn: async (txnId: string) => {
      await api.patch(`/finance/transactions/${txnId}/verify`)
    },
    onSuccess: () => {
      invalidateFinanceQueries()
      toast({
        title: "Transaction verified",
        description: "Transaction has been cleared and wallet updated.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify transaction.",
        variant: "destructive",
      })
    },
  })

  const totalReceived = Number(wallet?.total_received ?? 0)
  const totalSpent = Number(wallet?.total_spent ?? 0)
  const pendingApprovals = Number(wallet?.pending_approvals ?? 0)
  const balance = Number(wallet?.current_balance ?? totalReceived - totalSpent)

  return (
    <div className="space-y-6">
      {/* Wallet Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Received
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceived)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSpent)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {formatCurrency(pendingApprovals)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                balance >= 0 ? "text-blue-600" : "text-destructive"
              )}
            >
              {formatCurrency(Math.abs(balance))}
            </div>
            {balance < 0 && (
              <p className="text-xs text-destructive">Over budget</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Button */}
      <div className="flex justify-end">
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>
                Record a payment in or expense out for this project.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={paymentForm.handleSubmit((data) =>
                paymentMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={paymentForm.watch("category")}
                      onValueChange={(v) => {
                        const cat = v as "INFLOW" | "OUTFLOW"
                        paymentForm.setValue("category", cat)
                        paymentForm.setValue(
                          "source",
                          SOURCE_OPTIONS[cat][0].value as "CLIENT" | "VENDOR" | "LABOR" | "PETTY_CASH"
                        )
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFLOW">Money In</SelectItem>
                        <SelectItem value="OUTFLOW">Money Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={paymentForm.watch("source")}
                      onValueChange={(v) =>
                        paymentForm.setValue(
                          "source",
                          v as "CLIENT" | "VENDOR" | "LABOR" | "PETTY_CASH"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS[paymentForm.watch("category")].map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Amount (₹)</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    {...paymentForm.register("amount")}
                  />
                  {paymentForm.formState.errors.amount && (
                    <p className="text-xs text-destructive">
                      {paymentForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_desc">Description</Label>
                  <Input
                    id="payment_desc"
                    placeholder="e.g., Client advance payment"
                    {...paymentForm.register("description")}
                  />
                  {paymentForm.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {paymentForm.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  {canVerify && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={canVerify ? 7 : 6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : transactions.length ? (
                  transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm">
                        {format(new Date(txn.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.category === "INFLOW" ? "success" : "destructive"
                          }
                        >
                          {txn.category === "INFLOW" ? "IN" : "OUT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{txn.source}</TableCell>
                      <TableCell className="text-sm">
                        {txn.description}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium",
                          txn.category === "INFLOW"
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {txn.category === "INFLOW" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.status === "CLEARED"
                              ? "success"
                              : txn.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {txn.status}
                        </Badge>
                      </TableCell>
                      {canVerify && (
                        <TableCell>
                          {txn.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => verifyMutation.mutate(txn.id)}
                              disabled={verifyMutation.isPending}
                            >
                              {verifyMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-1 h-3 w-3" />
                              )}
                              Verify
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={canVerify ? 7 : 6} className="h-24 text-center">
                      <p className="text-muted-foreground">
                        No transactions recorded yet
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Daily Logs Tab ----

function DailyLogsTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [logSprintId, setLogSprintId] = useState("")
  const [logDate, setLogDate] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [logNotes, setLogNotes] = useState("")
  const [logPhotos, setLogPhotos] = useState<string[]>([])
  const [logVisibleToClient, setLogVisibleToClient] = useState(false)

  const { toast } = useToast()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canAddLog = ["SUPERVISOR", "MANAGER", "SUPER_ADMIN"].includes(
    userRole ?? ""
  )

  const { data: logs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ["project-daily-logs", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/daily-logs`)
      return response.data.items ?? response.data
    },
  })

  const addLogMutation = useMutation({
    mutationFn: (data: {
      sprint_id: string
      date: string
      notes: string
      image_urls: string[]
      visible_to_client: boolean
    }) => api.post(`/projects/${projectId}/daily-logs`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-daily-logs", projectId],
      })
      toast({
        title: "Added",
        description: "Daily log saved successfully",
      })
      setShowLogDialog(false)
      resetLogForm()
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast({
        title: "Error",
        description:
          err.response?.data?.detail || "Failed to save log",
        variant: "destructive",
      })
    },
  })

  function resetLogForm() {
    setLogSprintId("")
    setLogDate(new Date().toISOString().split("T")[0])
    setLogNotes("")
    setLogPhotos([])
    setLogVisibleToClient(false)
  }

  function handleSubmitLog() {
    if (!logSprintId) {
      toast({
        title: "Validation",
        description: "Please select a sprint",
        variant: "destructive",
      })
      return
    }
    if (logNotes.trim().length < 10) {
      toast({
        title: "Validation",
        description: "Notes must be at least 10 characters",
        variant: "destructive",
      })
      return
    }
    addLogMutation.mutate({
      sprint_id: logSprintId,
      date: logDate,
      notes: logNotes.trim(),
      image_urls: logPhotos,
      visible_to_client: logVisibleToClient,
    })
  }

  function getLogPhotos(log: DailyLog): string[] {
    return log.image_urls ?? log.images ?? []
  }

  return (
    <div className="space-y-4">
      {canAddLog && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowLogDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Daily Log
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No daily logs yet</p>
          <p className="text-xs text-muted-foreground">
            Supervisors can submit daily progress logs from the site
          </p>
        </div>
      )}

      {logs.map((log) => {
        const photos = getLogPhotos(log)
        return (
          <Card key={log.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {format(
                        new Date(log.date ?? log.created_at),
                        "EEEE, MMM d, yyyy"
                      )}
                    </p>
                    {log.visible_to_client && (
                      <Badge variant="outline" className="text-xs">
                        Visible to Client
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm">{log.notes}</p>

                  {log.blockers && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <div>
                        <p className="text-xs font-medium text-destructive">
                          Blockers
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.blockers}
                        </p>
                      </div>
                    </div>
                  )}

                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {photos.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={url}
                            alt={`Site photo ${i + 1}`}
                            className="h-16 w-16 rounded border object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Add Daily Log Dialog */}
      <Dialog
        open={showLogDialog}
        onOpenChange={(open) => {
          setShowLogDialog(open)
          if (!open) resetLogForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Daily Log</DialogTitle>
            <DialogDescription>
              Record today&apos;s site progress and upload photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Sprint */}
            <div className="space-y-2">
              <Label>Sprint</Label>
              <Select value={logSprintId} onValueChange={setLogSprintId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (min. 10 characters)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe work completed today..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
              />
              {logNotes.length > 0 && logNotes.trim().length < 10 && (
                <p className="text-xs text-destructive">
                  At least 10 characters required
                </p>
              )}
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <MultiFileUpload
                value={logPhotos}
                onChange={setLogPhotos}
                category="daily-logs"
                maxFiles={5}
                label="Upload site photos"
              />
            </div>

            {/* Visible to Client */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible-to-client"
                checked={logVisibleToClient}
                onChange={(e) => setLogVisibleToClient(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="visible-to-client" className="cursor-pointer">
                Visible to Client
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLogDialog(false)}
              disabled={addLogMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitLog}
              disabled={addLogMutation.isPending}
            >
              {addLogMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Variation Orders Tab ----

function VariationOrdersTab({ projectId }: { projectId: string }) {
  const [voOpen, setVoOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canManageVO = ["SUPER_ADMIN", "MANAGER"].includes(userRole ?? "")

  const { data: vos = [], isLoading } = useQuery<VariationOrder[]>({
    queryKey: ["project-vos", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/variation-orders`)
      return response.data.items ?? response.data
    },
  })

  const voForm = useForm<CreateVOFormValues>({
    resolver: zodResolver(createVOSchema),
    defaultValues: {
      description: "",
      additional_cost: 0,
    },
  })

  const updateVOMutation = useMutation({
    mutationFn: async ({ voId, status }: { voId: string; status: VOStatus }) => {
      await api.patch(`/projects/${projectId}/variation-orders/${voId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-vos", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project-wallet", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({
        title: "Variation order updated",
        description: "The VO status has been updated.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update variation order.",
        variant: "destructive",
      })
    },
  })

  const createVOMutation = useMutation({
    mutationFn: async (data: CreateVOFormValues) => {
      await api.post(`/projects/${projectId}/variation-orders`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-vos", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      setVoOpen(false)
      voForm.reset()
      toast({
        title: "Variation order created",
        description: "The VO has been submitted for approval.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create variation order.",
        variant: "destructive",
      })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={voOpen} onOpenChange={setVoOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create VO
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Variation Order</DialogTitle>
              <DialogDescription>
                Add a change request for additional work beyond the original
                scope.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={voForm.handleSubmit((data) =>
                createVOMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vo_description">Description</Label>
                  <Input
                    id="vo_description"
                    placeholder="e.g., Additional false ceiling in guest room"
                    {...voForm.register("description")}
                  />
                  {voForm.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {voForm.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vo_cost">Additional Cost (₹)</Label>
                  <Input
                    id="vo_cost"
                    type="number"
                    step="0.01"
                    {...voForm.register("additional_cost")}
                  />
                  {voForm.formState.errors.additional_cost && (
                    <p className="text-xs text-destructive">
                      {voForm.formState.errors.additional_cost.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createVOMutation.isPending}>
                  {createVOMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit VO
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && vos.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No variation orders</p>
          <p className="text-xs text-muted-foreground">
            Variation orders are created when additional scope is requested after
            contract signing
          </p>
        </div>
      )}

      <div className="rounded-md border">
        {vos.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VO ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Additional Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {canManageVO && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vos.map((vo) => (
                <TableRow key={vo.id}>
                  <TableCell className="font-mono text-xs">
                    VO-{vo.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-sm">{vo.description}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(vo.additional_cost)}
                  </TableCell>
                  <TableCell>{getVOStatusBadge(vo.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(vo.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {canManageVO && (
                    <TableCell>
                      {vo.status === "REQUESTED" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            disabled={updateVOMutation.isPending}
                            onClick={() =>
                              updateVOMutation.mutate({ voId: vo.id, status: "APPROVED" })
                            }
                          >
                            {updateVOMutation.isPending && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            disabled={updateVOMutation.isPending}
                            onClick={() =>
                              updateVOMutation.mutate({ voId: vo.id, status: "REJECTED" })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {vo.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          disabled={updateVOMutation.isPending}
                          onClick={() =>
                            updateVOMutation.mutate({ voId: vo.id, status: "PAID" })
                          }
                        >
                          {updateVOMutation.isPending && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          Mark as Paid
                        </Button>
                      )}
                      {(vo.status === "REJECTED" || vo.status === "PAID") && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ---- Labor Tab ----

const logAttendanceSchema = z.object({
  team_id: z.string().min(1, "Select a team"),
  sprint_id: z.string().min(1, "Select a sprint"),
  date: z.string().min(1, "Date is required"),
  workers_present: z.coerce.number().min(1, "At least 1 worker required"),
  total_hours: z.coerce.number().min(0.5, "Minimum 0.5 hours").max(24),
  notes: z.string().optional(),
})

type LogAttendanceFormValues = z.infer<typeof logAttendanceSchema>

function getAttendanceStatusBadge(status: AttendanceStatus) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">Paid</Badge>
    case "APPROVED_BY_MANAGER":
      return <Badge variant="default">Approved</Badge>
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function LaborTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [logOpen, setLogOpen] = useState(false)
  const [sprintFilter, setSprintFilter] = useState<string>("all")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: attendanceLogs = [], isLoading } = useQuery<AttendanceLog[]>({
    queryKey: ["project-attendance", projectId, sprintFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ project_id: projectId })
      if (sprintFilter !== "all") {
        params.set("sprint_id", sprintFilter)
      }
      const response = await api.get(`/labor/attendance?${params.toString()}`)
      return response.data.items ?? response.data
    },
  })

  const { data: teams = [] } = useQuery<LaborTeam[]>({
    queryKey: ["labor-teams"],
    queryFn: async () => {
      const response = await api.get("/labor/teams")
      return response.data.items ?? response.data
    },
  })

  const attendanceForm = useForm<LogAttendanceFormValues>({
    resolver: zodResolver(logAttendanceSchema),
    defaultValues: {
      team_id: "",
      sprint_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      workers_present: 1,
      total_hours: 8,
      notes: "",
    },
  })

  const logMutation = useMutation({
    mutationFn: async (data: LogAttendanceFormValues) => {
      await api.post("/labor/attendance", {
        project_id: projectId,
        ...data,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-attendance", projectId],
      })
      setLogOpen(false)
      attendanceForm.reset({
        team_id: "",
        sprint_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        workers_present: 1,
        total_hours: 8,
        notes: "",
      })
      toast({
        title: "Attendance logged",
        description: "Daily attendance has been recorded successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log attendance. Check inputs and try again.",
        variant: "destructive",
      })
    },
  })

  const activeSprint = sprints.find((s) => s.status === "ACTIVE")

  const teamMap = new Map(teams.map((t) => [t.id, t]))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceLogs.length}</div>
            <p className="text-xs text-muted-foreground">Attendance records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                attendanceLogs.reduce(
                  (sum, log) => sum + Number(log.calculated_cost ?? 0),
                  0
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(attendanceLogs.map((l) => l.team_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique teams logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Log Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={sprintFilter} onValueChange={setSprintFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Sprints" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {[...sprints]
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Attendance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Daily Attendance</DialogTitle>
              <DialogDescription>
                Record attendance for a labor team working on this project.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={attendanceForm.handleSubmit((data) =>
                logMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Labor Team</Label>
                  <Select
                    value={attendanceForm.watch("team_id")}
                    onValueChange={(v) => attendanceForm.setValue("team_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.specialization})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {attendanceForm.formState.errors.team_id && (
                    <p className="text-xs text-destructive">
                      {attendanceForm.formState.errors.team_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sprint</Label>
                  <Select
                    value={attendanceForm.watch("sprint_id")}
                    onValueChange={(v) =>
                      attendanceForm.setValue("sprint_id", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...sprints]
                        .sort((a, b) => a.sequence_order - b.sequence_order)
                        .map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            {sprint.name}
                            {sprint.id === activeSprint?.id ? " (Active)" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {attendanceForm.formState.errors.sprint_id && (
                    <p className="text-xs text-destructive">
                      {attendanceForm.formState.errors.sprint_id.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="att_date">Date</Label>
                    <Input
                      id="att_date"
                      type="date"
                      {...attendanceForm.register("date")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="att_workers">Workers</Label>
                    <Input
                      id="att_workers"
                      type="number"
                      min={1}
                      {...attendanceForm.register("workers_present")}
                    />
                    {attendanceForm.formState.errors.workers_present && (
                      <p className="text-xs text-destructive">
                        {attendanceForm.formState.errors.workers_present.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="att_hours">Hours</Label>
                    <Input
                      id="att_hours"
                      type="number"
                      step="0.5"
                      min={0.5}
                      max={24}
                      {...attendanceForm.register("total_hours")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="att_notes">Notes (optional)</Label>
                  <Input
                    id="att_notes"
                    placeholder="e.g., Completed wardrobe framing in master bedroom"
                    {...attendanceForm.register("notes")}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={logMutation.isPending}>
                  {logMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Log Attendance
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Records</CardTitle>
          <CardDescription>
            Daily labor attendance logged for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : attendanceLogs.length ? (
                  attendanceLogs.map((log) => {
                    const team = teamMap.get(log.team_id)
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {team?.name ?? log.team?.name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {team?.specialization ??
                                log.team?.specialization ??
                                ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{log.workers_present}</TableCell>
                        <TableCell>{log.total_hours}h</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(log.calculated_cost)}
                        </TableCell>
                        <TableCell>
                          {getAttendanceStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {log.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <HardHat className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No attendance records for this project
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click &quot;Log Attendance&quot; to record daily labor
                          attendance
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- PO Status Badge helper ----

function getPOStatusBadge(status: POStatus) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>
    case "ORDERED":
      return <Badge variant="default">Ordered</Badge>
    case "RECEIVED":
      return <Badge variant="success">Received</Badge>
    case "CANCELLED":
      return <Badge variant="destructive">Cancelled</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ---- Issue Stock Schema ----
const issueStockSchema = z.object({
  item_id: z.string().min(1, "Select an item"),
  quantity: z.coerce.number().min(0.01, "Quantity must be positive"),
})

type IssueStockFormValues = z.infer<typeof issueStockSchema>

// ---- Materials Tab ----

function MaterialsTab({ projectId }: { projectId: string }) {
  const [issueOpen, setIssueOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: materials, isLoading } = useQuery<ProjectMaterials>({
    queryKey: ["project-materials", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/materials`)
      return response.data
    },
  })

  const { data: inventoryItems = [] } = useQuery<Item[]>({
    queryKey: ["inventory-items-for-issue"],
    queryFn: async () => {
      const response = await api.get("/inventory/items?limit=200")
      return response.data.items ?? response.data
    },
    enabled: issueOpen,
  })

  const issueForm = useForm<IssueStockFormValues>({
    resolver: zodResolver(issueStockSchema),
    defaultValues: { item_id: "", quantity: 1 },
  })

  const issueMutation = useMutation({
    mutationFn: async (data: IssueStockFormValues) => {
      await api.post(`/inventory/items/${data.item_id}/issue`, {
        project_id: projectId,
        quantity: data.quantity,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-materials", projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ["project-wallet", projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ["project-transactions", projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      })
      setIssueOpen(false)
      issueForm.reset({ item_id: "", quantity: 1 })
      toast({
        title: "Stock issued",
        description: "Warehouse stock has been issued to this project.",
      })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.detail ??
          "Failed to issue stock. Check inputs and try again.",
        variant: "destructive",
      })
    },
  })

  const pos = materials?.purchase_orders ?? []
  const stockIssues = materials?.stock_issues ?? []
  const summary = materials?.summary

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Purchase Orders
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(summary?.total_po_cost ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {pos.length} order{pos.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Stock Issued
            </CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(summary?.total_stock_issued_cost ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              {stockIssues.length} issue{stockIssues.length !== 1 ? "s" : ""}{" "}
              from warehouse
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Materials
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(Number(summary?.total_materials_cost ?? 0))}
            </div>
            <p className="text-xs text-muted-foreground">POs + stock issued</p>
          </CardContent>
        </Card>
      </div>

      {/* Issue Stock Button */}
      <div className="flex justify-end">
        <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Issue Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Stock to Project</DialogTitle>
              <DialogDescription>
                Issue items from warehouse stock to this project.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={issueForm.handleSubmit((data) =>
                issueMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Item</Label>
                  <Select
                    value={issueForm.watch("item_id")}
                    onValueChange={(v) => issueForm.setValue("item_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems
                        .filter((item) => item.current_stock > 0)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.current_stock} {item.unit}{" "}
                            available)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {issueForm.formState.errors.item_id && (
                    <p className="text-xs text-destructive">
                      {issueForm.formState.errors.item_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issue_qty">Quantity</Label>
                  <Input
                    id="issue_qty"
                    type="number"
                    step="0.01"
                    min={0.01}
                    {...issueForm.register("quantity")}
                  />
                  {issueForm.formState.errors.quantity && (
                    <p className="text-xs text-destructive">
                      {issueForm.formState.errors.quantity.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIssueOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={issueMutation.isPending}>
                  {issueMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Issue Stock
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purchase Orders</CardTitle>
          <CardDescription>
            Project-specific purchase orders from vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO ID</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : pos.length ? (
                  pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-sm">
                        PO-{po.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {po.vendor_name ?? "—"}
                      </TableCell>
                      <TableCell>{po.items?.length ?? 0}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(po.total_amount)}
                      </TableCell>
                      <TableCell>
                        {getPOStatusBadge(po.status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(po.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No purchase orders linked to this project
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stock Issues</CardTitle>
          <CardDescription>
            Items issued from warehouse to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : stockIssues.length ? (
                  stockIssues.map((si) => (
                    <TableRow key={si.id}>
                      <TableCell className="font-medium text-sm">
                        {si.item_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {si.item_category || "—"}
                      </TableCell>
                      <TableCell>
                        {Math.abs(si.quantity)} {si.item_unit}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(si.unit_cost_at_time)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(si.total_cost)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(si.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {si.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Warehouse className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No stock issued from warehouse yet
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click &quot;Issue Stock&quot; to allocate warehouse
                          items
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Quality Tab ----

function QualityTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState<"inspections" | "snags">("inspections")
  const [createInspectionOpen, setCreateInspectionOpen] = useState(false)
  const [createSnagOpen, setCreateSnagOpen] = useState(false)

  // Queries
  const { data: inspections = [], isLoading: loadingInspections } = useQuery<any[]>({
    queryKey: ["quality-inspections", projectId],
    queryFn: async () => {
      const res = await api.get(`/quality/inspections?project_id=${projectId}`)
      return res.data.items ?? res.data
    },
  })

  const { data: snags = [], isLoading: loadingSnags } = useQuery<any[]>({
    queryKey: ["quality-snags", projectId],
    queryFn: async () => {
      const res = await api.get(`/quality/snags?project_id=${projectId}`)
      return res.data.items ?? res.data
    },
  })

  const { data: qualitySummary } = useQuery<any>({
    queryKey: ["quality-summary", projectId],
    queryFn: async () => {
      const res = await api.get(`/quality/projects/${projectId}/summary`)
      return res.data
    },
  })

  // Create Inspection state
  const [inspTitle, setInspTitle] = useState("")
  const [inspSprintId, setInspSprintId] = useState("")
  const [inspItems, setInspItems] = useState<{ description: string }[]>([{ description: "" }])

  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        project_id: projectId,
        sprint_id: inspSprintId || undefined,
        title: inspTitle,
        checklist_items: inspItems.filter((i) => i.description.trim()),
      }
      await api.post("/quality/inspections", payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections", projectId] })
      queryClient.invalidateQueries({ queryKey: ["quality-summary", projectId] })
      setCreateInspectionOpen(false)
      setInspTitle("")
      setInspSprintId("")
      setInspItems([{ description: "" }])
      toast({ title: "Inspection created" })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed to create inspection.", variant: "destructive" })
    },
  })

  const completeInspectionMutation = useMutation({
    mutationFn: async (inspectionId: string) => {
      await api.post(`/quality/inspections/${inspectionId}/complete`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-inspections", projectId] })
      queryClient.invalidateQueries({ queryKey: ["quality-snags", projectId] })
      queryClient.invalidateQueries({ queryKey: ["quality-summary", projectId] })
      toast({ title: "Inspection completed", description: "Snags auto-created from failed items." })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  // Create Snag state
  const [snagDesc, setSnagDesc] = useState("")
  const [snagSeverity, setSnagSeverity] = useState("MEDIUM")

  const createSnagMutation = useMutation({
    mutationFn: async () => {
      await api.post("/quality/snags", {
        project_id: projectId,
        description: snagDesc,
        severity: snagSeverity,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-snags", projectId] })
      queryClient.invalidateQueries({ queryKey: ["quality-summary", projectId] })
      setCreateSnagOpen(false)
      setSnagDesc("")
      setSnagSeverity("MEDIUM")
      toast({ title: "Snag created" })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  const updateSnagMutation = useMutation({
    mutationFn: async ({ snagId, status }: { snagId: string; status: string }) => {
      await api.patch(`/quality/snags/${snagId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-snags", projectId] })
      queryClient.invalidateQueries({ queryKey: ["quality-summary", projectId] })
      toast({ title: "Snag updated" })
    },
  })

  const severityColors: Record<string, string> = {
    LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  }

  const snagStatusColors: Record<string, string> = {
    OPEN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    VERIFIED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {qualitySummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inspections</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qualitySummary.completed_inspections}/{qualitySummary.total_inspections}</div>
              <p className="text-xs text-muted-foreground">completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qualitySummary.avg_score != null ? `${Math.round(qualitySummary.avg_score)}%` : "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Snags</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", qualitySummary.open_snags > 0 && "text-orange-600")}>
                {qualitySummary.open_snags}
              </div>
              <p className="text-xs text-muted-foreground">{qualitySummary.critical_snags} critical</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{qualitySummary.resolved_snags}</div>
              <p className="text-xs text-muted-foreground">of {qualitySummary.total_snags} total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", subTab === "inspections" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          onClick={() => setSubTab("inspections")}
        >
          Inspections
        </button>
        <button
          className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", subTab === "snags" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
          onClick={() => setSubTab("snags")}
        >
          Snag List
        </button>
      </div>

      {subTab === "inspections" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createInspectionOpen} onOpenChange={setCreateInspectionOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />New Inspection</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Inspection</DialogTitle>
                  <DialogDescription>Add a quality inspection with a checklist.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={inspTitle} onChange={(e) => setInspTitle(e.target.value)} placeholder="e.g. Sprint 3 Final Check" />
                  </div>
                  <div className="space-y-2">
                    <Label>Sprint (Optional)</Label>
                    <select value={inspSprintId} onChange={(e) => setInspSprintId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Select sprint</option>
                      {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Checklist Items</Label>
                    {inspItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={item.description}
                          onChange={(e) => {
                            const updated = [...inspItems]
                            updated[idx] = { description: e.target.value }
                            setInspItems(updated)
                          }}
                          placeholder={`Item ${idx + 1}`}
                        />
                        {inspItems.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => setInspItems(inspItems.filter((_, i) => i !== idx))}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setInspItems([...inspItems, { description: "" }])}>
                      <Plus className="mr-1 h-3 w-3" /> Add Item
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateInspectionOpen(false)}>Cancel</Button>
                  <Button onClick={() => createInspectionMutation.mutate()} disabled={!inspTitle || createInspectionMutation.isPending}>
                    {createInspectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingInspections ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : inspections.length ? (
                  inspections.map((insp: any) => (
                    <TableRow key={insp.id}>
                      <TableCell className="font-medium">{insp.title}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-xs",
                          insp.status === "COMPLETED" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          insp.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                          "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
                        )}>{insp.status}</Badge>
                      </TableCell>
                      <TableCell>{insp.overall_score != null ? `${Math.round(insp.overall_score)}%` : "—"}</TableCell>
                      <TableCell>
                        <span className="text-green-600">{insp.pass_count}P</span>
                        {" / "}
                        <span className="text-red-600">{insp.fail_count}F</span>
                        {" / "}
                        {insp.total_items}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(insp.inspection_date ?? insp.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                      <TableCell>
                        {insp.status !== "COMPLETED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => completeInspectionMutation.mutate(insp.id)}
                            disabled={completeInspectionMutation.isPending}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Complete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No inspections yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {subTab === "snags" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={createSnagOpen} onOpenChange={setCreateSnagOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Report Snag</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report Snag</DialogTitle>
                  <DialogDescription>Log a defect or issue found on site.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={snagDesc} onChange={(e) => setSnagDesc(e.target.value)} placeholder="Describe the issue..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <select value={snagSeverity} onChange={(e) => setSnagSeverity(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateSnagOpen(false)}>Cancel</Button>
                  <Button onClick={() => createSnagMutation.mutate()} disabled={!snagDesc || createSnagMutation.isPending}>
                    {createSnagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Snag
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSnags ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : snags.length ? (
                  snags.map((snag: any) => (
                    <TableRow key={snag.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">{snag.description}</TableCell>
                      <TableCell><Badge className={cn("text-xs", severityColors[snag.severity])}>{snag.severity}</Badge></TableCell>
                      <TableCell><Badge className={cn("text-xs", snagStatusColors[snag.status])}>{snag.status.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{snag.assigned_to_name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(snag.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                      <TableCell>
                        {snag.status !== "VERIFIED" && (
                          <Select
                            value={snag.status}
                            onValueChange={(val) => updateSnagMutation.mutate({ snagId: snag.id, status: val })}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="RESOLVED">Resolved</SelectItem>
                              <SelectItem value="VERIFIED">Verified</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No snags reported</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Budget Tab ----

function BudgetTab({ projectId }: { projectId: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)
  const [newCategory, setNewCategory] = useState("MATERIAL")
  const [newDescription, setNewDescription] = useState("")
  const [newAmount, setNewAmount] = useState("")

  const { data: budgetItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["budget-items", projectId],
    queryFn: async () => {
      const res = await api.get(`/finance/projects/${projectId}/budget`)
      return res.data.items ?? res.data
    },
  })

  const { data: budgetVsActual } = useQuery<any>({
    queryKey: ["budget-vs-actual", projectId],
    queryFn: async () => {
      const res = await api.get(`/finance/projects/${projectId}/budget-vs-actual`)
      return res.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/finance/projects/${projectId}/budget`, [
        { category: newCategory, description: newDescription || undefined, budgeted_amount: parseFloat(newAmount) },
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] })
      queryClient.invalidateQueries({ queryKey: ["budget-vs-actual", projectId] })
      setAddOpen(false)
      setNewCategory("MATERIAL")
      setNewDescription("")
      setNewAmount("")
      toast({ title: "Budget line added" })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed.", variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/finance/projects/${projectId}/budget/${itemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-items", projectId] })
      queryClient.invalidateQueries({ queryKey: ["budget-vs-actual", projectId] })
      toast({ title: "Budget line removed" })
    },
  })

  const bva = budgetVsActual?.line_items ?? []

  return (
    <div className="space-y-6">
      {/* Budget vs Actual Summary */}
      {budgetVsActual && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(budgetVsActual.total_budgeted)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(budgetVsActual.total_actual)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", budgetVsActual.total_variance < 0 ? "text-destructive" : "text-green-600")}>
                {formatCurrency(budgetVsActual.total_variance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {budgetVsActual.total_variance < 0 ? "Over budget" : "Under budget"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variance breakdown */}
      {bva.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget vs Actual by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bva.map((item: any) => {
                const pct = item.budgeted > 0 ? Math.round((item.actual / item.budgeted) * 100) : 0
                return (
                  <div key={item.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{formatCurrency(item.actual)} / {formatCurrency(item.budgeted)}</span>
                        {item.alert && <Badge variant="destructive" className="text-xs">Over 10%</Badge>}
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-secondary">
                      <div
                        className={cn("h-2.5 rounded-full transition-all", item.alert ? "bg-red-500" : "bg-primary")}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Budget Line Items</CardTitle>
            <CardDescription>Set budget amounts per category</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Line</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Budget Line</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="MATERIAL">Material</option>
                    <option value="LABOR">Labor</option>
                    <option value="SUBCONTRACTOR">Subcontractor</option>
                    <option value="OVERHEAD">Overhead</option>
                    <option value="CONTINGENCY">Contingency</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Budgeted Amount</Label>
                  <Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!newAmount || createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : budgetItems.length ? (
                  budgetItems.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell><Badge variant="outline" className="text-xs">{item.category}</Badge></TableCell>
                      <TableCell>{item.description || "—"}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.budgeted_amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(item.id)} disabled={deleteMutation.isPending}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No budget lines set</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Indent (Material Request) Tab ----

function IndentTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: requests = [], isLoading } = useQuery<any[]>({
    queryKey: ["project-material-requests", projectId],
    queryFn: async () => {
      const res = await api.get(`/material-requests?project_id=${projectId}&limit=100`)
      return res.data.items ?? res.data
    },
  })

  const { data: inventoryItems = [] } = useQuery<any[]>({
    queryKey: ["inventory-items-for-indent"],
    queryFn: async () => {
      const res = await api.get("/inventory/items?limit=200")
      return res.data.items ?? res.data
    },
    enabled: createOpen,
  })

  // Create form state
  const [indentSprintId, setIndentSprintId] = useState("")
  const [indentUrgency, setIndentUrgency] = useState("MEDIUM")
  const [indentNotes, setIndentNotes] = useState("")
  const [indentItems, setIndentItems] = useState<{ item_id: string; quantity_requested: number }[]>([])
  const [addItemId, setAddItemId] = useState("")
  const [addQty, setAddQty] = useState("")

  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post("/material-requests", {
        project_id: projectId,
        sprint_id: indentSprintId || undefined,
        urgency: indentUrgency,
        notes: indentNotes || undefined,
        items: indentItems,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-material-requests", projectId] })
      setCreateOpen(false)
      setIndentSprintId("")
      setIndentUrgency("MEDIUM")
      setIndentNotes("")
      setIndentItems([])
      toast({ title: "Material request submitted", description: "Awaiting manager approval." })
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.response?.data?.detail || "Failed to submit request.", variant: "destructive" })
    },
  })

  function handleAddItem() {
    if (!addItemId || !addQty) return
    setIndentItems((prev) => [...prev, { item_id: addItemId, quantity_requested: parseFloat(addQty) }])
    setAddItemId("")
    setAddQty("")
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    APPROVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    PARTIALLY_APPROVED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    FULFILLED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Request Material</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Request Materials</DialogTitle>
              <DialogDescription>Submit a material indent for this project.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sprint (Optional)</Label>
                  <select value={indentSprintId} onChange={(e) => setIndentSprintId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select sprint</option>
                    {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Urgency</Label>
                  <select value={indentUrgency} onChange={(e) => setIndentUrgency(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              {/* Items added */}
              {indentItems.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {indentItems.map((ii, idx) => {
                      const item = inventoryItems.find((i: any) => i.id === ii.item_id)
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item?.name || ii.item_id.slice(0, 8)}</TableCell>
                          <TableCell>{ii.quantity_requested}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setIndentItems(indentItems.filter((_, i) => i !== idx))}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}

              {/* Add item row */}
              <div className="grid grid-cols-3 gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Item</Label>
                  <select value={addItemId} onChange={(e) => setAddItemId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm">
                    <option value="">Select item</option>
                    {inventoryItems.map((i: any) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" className="h-9" value={addQty} onChange={(e) => setAddQty(e.target.value)} />
                </div>
                <Button size="sm" className="h-9" onClick={handleAddItem} disabled={!addItemId || !addQty}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input value={indentNotes} onChange={(e) => setIndentNotes(e.target.value)} placeholder="Any additional notes..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate()} disabled={indentItems.length === 0 || createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request #</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : requests.length ? (
              requests.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-sm">MR-{req.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>{req.items_count ?? req.items?.length ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs",
                      req.urgency === "HIGH" && "border-red-500 text-red-600",
                      req.urgency === "MEDIUM" && "border-yellow-500 text-yellow-600"
                    )}>{req.urgency}</Badge>
                  </TableCell>
                  <TableCell><Badge className={cn("text-xs", statusColors[req.status])}>{req.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(req.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{req.notes ?? "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No material requests yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ---- P&L Tab ----

function PnLTab({ projectId }: { projectId: string }) {
  const { data: pnl, isLoading } = useQuery<any>({
    queryKey: ["project-pnl", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/pnl`)
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!pnl) {
    return <p className="text-center text-muted-foreground py-8">No P&L data available.</p>
  }

  const statusColors: Record<string, string> = {
    PROFITABLE: "text-green-600",
    BREAK_EVEN: "text-yellow-600",
    LOSS_MAKING: "text-red-600",
  }

  return (
    <div className="space-y-6">
      {/* Status & Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pnl.revenue)}</div>
            {pnl.approved_vo_total > 0 && (
              <p className="text-xs text-muted-foreground">incl. {formatCurrency(pnl.approved_vo_total)} VOs</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(pnl.total_cost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", statusColors[pnl.status])}>
              {formatCurrency(pnl.gross_profit)}
            </div>
            <p className="text-xs text-muted-foreground">{pnl.margin_percent}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", statusColors[pnl.status])}>
              {pnl.status.replace("_", " ")}
            </div>
            <p className="text-xs text-muted-foreground">
              Burn: {formatCurrency(pnl.monthly_burn_rate)}/mo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(pnl.cost_breakdown).map(([key, value]) => {
              const amount = Number(value)
              const pct = pnl.total_cost > 0 ? Math.round((amount / pnl.total_cost) * 100) : 0
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium capitalize">{key}</span>
                    <span className="text-muted-foreground">{formatCurrency(amount)} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-secondary">
                    <div className="h-2.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(pnl.total_received)}</p>
              <p className="text-xs text-muted-foreground">Total Received</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(pnl.total_spent)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pnl.pending_approvals)}</p>
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Main Page ----

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`)
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    )
  }

  const clientName =
    project.client?.user?.full_name ??
    project.client?.lead?.name ??
    "Unknown Client"

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {clientName}&apos;s Project
              </h2>
              <Badge
                variant={
                  project.status === "IN_PROGRESS"
                    ? "default"
                    : project.status === "COMPLETED"
                    ? "success"
                    : project.status === "ON_HOLD"
                    ? "warning"
                    : "secondary"
                }
              >
                {project.status.replace("_", " ")}
              </Badge>
              {project.expected_end_date &&
               new Date(project.expected_end_date) < new Date() &&
               project.status !== "COMPLETED" && (
                <Badge variant="destructive">Overdue</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              PRJ-{project.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sprints">Sprints</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="daily-logs">Daily Logs</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="variation-orders">Variation Orders</TabsTrigger>
            <TabsTrigger value="quality">Quality</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="indent">Indent</TabsTrigger>
            <TabsTrigger value="pnl">P&L</TabsTrigger>
            <TabsTrigger value="bom">BOM</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab project={project} projectId={projectId} />
          </TabsContent>

          <TabsContent value="sprints">
            <SprintsTab
              sprints={project.sprints ?? []}
              projectId={projectId}
              projectStartDate={project.start_date}
            />
          </TabsContent>

          <TabsContent value="finance">
            <FinanceTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="daily-logs">
            <DailyLogsTab projectId={projectId} sprints={project.sprints ?? []} />
          </TabsContent>

          <TabsContent value="labor">
            <LaborTab
              projectId={projectId}
              sprints={project.sprints ?? []}
            />
          </TabsContent>

          <TabsContent value="materials">
            <MaterialsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="variation-orders">
            <VariationOrdersTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="quality">
            <QualityTab projectId={projectId} sprints={project.sprints ?? []} />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="indent">
            <IndentTab projectId={projectId} sprints={project.sprints ?? []} />
          </TabsContent>

          <TabsContent value="pnl">
            <PnLTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="bom">
            <BOMTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="team">
            <TeamTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Project } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  HardHat,
  Loader2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"

interface PayrollEntry {
  team_id: string
  team_name: string
  specialization: string
  project_id: string
  project_name: string
  days_worked: number
  total_workers: number
  total_hours: number
  calculated_cost: number
  status: string
}

interface PayrollSummary {
  entries: PayrollEntry[]
  total_cost: number
  total_approved: number
  total_pending: number
}

function getStatusBadge(status: string) {
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

export default function PayrollPage() {
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [weekOffset, setWeekOffset] = useState(0)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  const currentDate = new Date()
  const targetDate = weekOffset === 0
    ? currentDate
    : weekOffset > 0
    ? addWeeks(currentDate, weekOffset)
    : subWeeks(currentDate, Math.abs(weekOffset))

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 })

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      const response = await api.get("/projects")
      return response.data.items ?? response.data
    },
  })

  const { data: payrollData, isLoading } = useQuery<PayrollSummary>({
    queryKey: ["payroll", selectedProject, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const params = new URLSearchParams({
        week_start: format(weekStart, "yyyy-MM-dd"),
        week_end: format(weekEnd, "yyyy-MM-dd"),
      })
      if (selectedProject !== "all") {
        params.set("project_id", selectedProject)
      }
      const response = await api.get(`/labor/payroll?${params.toString()}`)
      return response.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: async ({
      teamId,
      projectId,
    }: {
      teamId: string
      projectId: string
    }) => {
      const params = new URLSearchParams({
        team_id: teamId,
        week_start: format(weekStart, "yyyy-MM-dd"),
        week_end: format(weekEnd, "yyyy-MM-dd"),
        project_id: projectId,
      })
      await api.post(`/labor/payroll/approve?${params.toString()}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] })
      toast({
        title: "Payroll approved",
        description:
          "Team payout has been approved and deducted from project wallet.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description:
          "Failed to approve payroll. Ensure project has sufficient funds.",
        variant: "destructive",
      })
    },
  })

  const entries = payrollData?.entries ?? []
  const totalCost = Number(payrollData?.total_cost ?? 0)
  const totalApproved = Number(payrollData?.total_approved ?? 0)
  const totalPending = Number(payrollData?.total_pending ?? 0)

  // Determine column count based on whether we show the project column
  const showProjectColumn = selectedProject === "all"
  const colSpan = showProjectColumn ? 9 : 8

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HardHat className="h-6 w-6" />
            Weekly Payroll
          </h2>
          <p className="text-muted-foreground">
            Review and approve labor attendance and payouts
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.client?.user?.full_name
                    ? `${project.client.user.full_name}'s Project`
                    : `Project ${project.id.slice(0, 8)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-md border px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset(weekOffset - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[200px] text-center text-sm font-medium">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalCost)}
              </div>
              <p className="text-xs text-muted-foreground">
                For selected week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalApproved)}
              </div>
              <p className="text-xs text-muted-foreground">
                Deducted from project wallets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalPending)}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Attendance Summary by Team
            </CardTitle>
            <CardDescription>
              Grouped labor attendance for the selected week
              {showProjectColumn ? " across all projects" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    {showProjectColumn && <TableHead>Project</TableHead>}
                    <TableHead>Specialization</TableHead>
                    <TableHead>Days Worked</TableHead>
                    <TableHead>Avg. Workers/Day</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : entries.length ? (
                    entries.map((entry) => (
                      <TableRow
                        key={`${entry.team_id}-${entry.project_id}`}
                      >
                        <TableCell className="font-medium">
                          {entry.team_name}
                        </TableCell>
                        {showProjectColumn && (
                          <TableCell>
                            <button
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={() =>
                                router.push(
                                  `/dashboard/projects/${entry.project_id}`
                                )
                              }
                            >
                              {entry.project_name}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline">
                            {entry.specialization}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.days_worked}</TableCell>
                        <TableCell>{entry.total_workers}</TableCell>
                        <TableCell>{entry.total_hours}h</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(entry.calculated_cost)}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        <TableCell>
                          {entry.status === "PENDING" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                approveMutation.mutate({
                                  teamId: entry.team_id,
                                  projectId: entry.project_id,
                                })
                              }
                              disabled={approveMutation.isPending}
                            >
                              {approveMutation.isPending ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : null}
                              Approve & Pay
                            </Button>
                          )}
                          {entry.status === "APPROVED_BY_MANAGER" && (
                            <span className="text-xs text-muted-foreground">
                              Approved
                            </span>
                          )}
                          {entry.status === "PAID" && (
                            <span className="text-xs text-green-600">
                              Paid
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <HardHat className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No attendance records for this week
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Select a different week or project to view payroll
                            data
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
    </RoleGuard>
  )
}

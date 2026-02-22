"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type {
  Project,
  Sprint,
  SprintStatus,
  DailyLog,
  Transaction,
} from "@/types"
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
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Image as ImageIcon,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn, formatCurrency } from "@/lib/utils"

function getSprintStatusBadge(status: SprintStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Upcoming</Badge>
    case "ACTIVE":
      return <Badge variant="default">In Progress</Badge>
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>
    case "DELAYED":
      return <Badge variant="destructive">Delayed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function ClientPortalPage() {
  const params = useParams()
  const { toast } = useToast()
  const projectId = params.projectId as string

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`)
      return response.data
    },
  })

  const { data: dailyLogs = [] } = useQuery<DailyLog[]>({
    queryKey: ["client-daily-logs", projectId],
    queryFn: async () => {
      const response = await api.get(
        `/projects/${projectId}/daily-logs?client_visible=true`
      )
      return response.data.items ?? response.data
    },
    enabled: !!project,
  })

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["client-transactions", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/transactions`)
      return response.data.items ?? response.data
    },
    enabled: !!project,
  })

  if (projectLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  const totalValue = Number(project.total_project_value ?? 0)
  const received = Number(project.wallet?.total_received ?? 0)
  const sortedSprints = [...(project.sprints ?? [])].sort(
    (a, b) => a.sequence_order - b.sequence_order
  )
  const completedSprints = sortedSprints.filter(
    (s) => s.status === "COMPLETED"
  ).length
  const totalSprints = sortedSprints.length || 6
  const progressPercent = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0

  const clientPayments = transactions.filter(
    (t) => t.category === "INFLOW" && t.source === "CLIENT"
  )

  return (
    <RoleGuard allowedRoles={["CLIENT", "SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            My Project
          </h2>
          <p className="text-muted-foreground">
            Track progress, view updates, and manage payments
          </p>
        </div>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Project Status
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
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
                className="text-sm"
              >
                {project.status.replace("_", " ")}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                {completedSprints} of {totalSprints} phases complete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Project Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(received)} paid so far
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Timeline</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {project.start_date
                  ? format(new Date(project.start_date), "MMM d")
                  : "TBD"}{" "}
                -{" "}
                {project.expected_end_date
                  ? format(new Date(project.expected_end_date), "MMM d, yyyy")
                  : "TBD"}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected completion date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completion</span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <div className="h-4 w-full rounded-full bg-secondary">
                <div
                  className="h-4 rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sprint Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Phases</CardTitle>
            <CardDescription>
              Standard 6-phase execution timeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedSprints.map((sprint) => {
                const startDate = sprint.start_date
                  ? format(new Date(sprint.start_date), "MMM d")
                  : "TBD"
                const endDate = sprint.end_date
                  ? format(new Date(sprint.end_date), "MMM d")
                  : "TBD"

                return (
                  <div
                    key={sprint.id}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-3",
                      sprint.status === "ACTIVE" && "border-primary bg-primary/5",
                      sprint.status === "COMPLETED" && "bg-green-50/50"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        sprint.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : sprint.status === "ACTIVE"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {sprint.status === "COMPLETED" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        sprint.sequence_order
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{sprint.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {startDate} - {endDate}
                      </p>
                    </div>
                    {getSprintStatusBadge(sprint.status)}
                  </div>
                )
              })}

              {sortedSprints.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Sprint timeline will appear once the project starts
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Logs (Client Visible) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Updates</CardTitle>
            <CardDescription>
              Daily updates from the project site
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dailyLogs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No progress updates available yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyLogs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 border-b pb-4 last:border-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {format(
                          new Date(log.created_at),
                          "EEEE, MMM d, yyyy"
                        )}
                      </p>
                      <p className="mt-1 text-sm">{log.notes}</p>
                      {log.images && log.images.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {log.images.map((img, i) => (
                            <div
                              key={i}
                              className="h-16 w-16 rounded-md border bg-muted overflow-hidden"
                            >
                              <img
                                src={img}
                                alt={`Update photo ${i + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payment History</CardTitle>
              <CardDescription>Your payments for this project</CardDescription>
            </div>
            <Button
              onClick={() => {
                toast({
                  title: "Payment gateway",
                  description:
                    "Online payment integration is not yet available. Please contact your project manager.",
                })
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Make Payment
            </Button>
          </CardHeader>
          <CardContent>
            {clientPayments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No payment records found
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {format(
                            new Date(payment.created_at),
                            "MMM d, yyyy"
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.description}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "CLEARED"
                                ? "success"
                                : payment.status === "PENDING"
                                ? "warning"
                                : "destructive"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Payment Summary */}
            <div className="mt-4 flex items-center justify-between rounded-md bg-muted/50 p-4">
              <div>
                <p className="text-sm font-medium">Total Paid</p>
                <p className="text-xs text-muted-foreground">
                  Out of {formatCurrency(totalValue)} project value
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(received)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalValue - received)} remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}

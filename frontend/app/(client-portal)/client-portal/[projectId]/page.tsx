"use client"

import { use } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Loader2,
  Calendar,
  IndianRupee,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  FileText,
  Download,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import api from "@/lib/api"
import type {
  Project,
  Sprint,
  Transaction,
  DailyLog,
  ProjectDocument,
} from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

// ── Helpers ──

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

function getSprintStatusConfig(status: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Active", color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50" }
    case "COMPLETED":
      return { label: "Completed", color: "bg-green-500", textColor: "text-green-700", bgLight: "bg-green-50" }
    case "DELAYED":
      return { label: "Delayed", color: "bg-red-500", textColor: "text-red-700", bgLight: "bg-red-50" }
    case "PENDING":
    default:
      return { label: "Upcoming", color: "bg-gray-300", textColor: "text-gray-600", bgLight: "bg-gray-50" }
  }
}

function getProjectProgress(project: Project): number {
  if (!project.sprints || project.sprints.length === 0) return 0
  const completed = project.sprints.filter((s) => s.status === "COMPLETED").length
  return Math.round((completed / project.sprints.length) * 100)
}

// ── Overview Tab ──

function OverviewTab({ project }: { project: Project }) {
  const progress = getProjectProgress(project)
  const currentSprint = project.sprints?.find((s) => s.status === "ACTIVE")
  const totalValue = project.total_project_value ?? 0
  const totalReceived = project.wallet?.total_received ?? 0
  const paymentProgress = totalValue > 0 ? Math.round((totalReceived / totalValue) * 100) : 0

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Project Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Project Value</CardDescription>
          <CardTitle className="text-2xl">{formatCurrency(totalValue)}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Payment Progress</span>
                <span className="font-medium">{paymentProgress}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted">
                <div
                  className="h-2.5 rounded-full bg-green-500 transition-all"
                  style={{ width: `${paymentProgress}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Paid: {formatCurrency(totalReceived)}
              </span>
              <span className="text-muted-foreground">
                Remaining: {formatCurrency(totalValue - totalReceived)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Overall Progress</CardDescription>
          <CardTitle className="text-2xl">{progress}%</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className="h-2.5 rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            {currentSprint && (
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Current Sprint:</span>
                <span className="font-medium">{currentSprint.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Start Date: </span>
              <span className="font-medium">{formatDate(project.start_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Expected Completion: </span>
              <span className="font-medium">{formatDate(project.expected_end_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Total Sprints: </span>
              <span className="font-medium">{project.sprints?.length ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Contact */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Need Help?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Reach out to our team for any questions about your project.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="tel:+911234567890">
                <Phone className="mr-2 h-4 w-4" />
                Call Us
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:support@igolointerior.com">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Timeline Tab ──

function TimelineTab({ project }: { project: Project }) {
  const { data: dailyLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["client-daily-logs", project.id],
    queryFn: async () => {
      const res = await api.get(
        `/projects/${project.id}/daily-logs?visible_to_client=true`
      )
      return res.data as DailyLog[]
    },
  })

  const sprints = project.sprints ?? []

  return (
    <div className="space-y-8">
      {/* Sprint Timeline - Visual Blocks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sprint Timeline</CardTitle>
          <CardDescription>
            Your project follows a 6-phase execution plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sprints
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((sprint) => {
                const config = getSprintStatusConfig(sprint.status)
                return (
                  <div
                    key={sprint.id}
                    className={`flex items-center gap-4 rounded-lg border p-4 ${config.bgLight}`}
                  >
                    <div
                      className={`h-3 w-3 shrink-0 rounded-full ${config.color}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sprint.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${config.textColor}`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDateShort(sprint.start_date)} &mdash;{" "}
                        {formatDateShort(sprint.end_date)}
                      </p>
                    </div>
                    {sprint.status === "ACTIVE" && (
                      <div className="text-right">
                        <span className="text-sm font-medium text-blue-700">
                          {sprint.completion_percentage ?? 0}%
                        </span>
                      </div>
                    )}
                    {sprint.status === "COMPLETED" && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    )}
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Site Updates Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site Updates</CardTitle>
          <CardDescription>
            Latest progress updates from the project site
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !dailyLogs || dailyLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Clock className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No site updates available yet. Updates will appear here as work progresses.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {dailyLogs.map((log) => (
                <div key={log.id} className="relative pl-6">
                  <div className="absolute left-0 top-1 h-3 w-3 rounded-full border-2 border-primary bg-white" />
                  <div className="absolute left-[5px] top-4 h-[calc(100%+12px)] w-0.5 bg-border last:hidden" />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDate(log.date)}
                      </span>
                    </div>
                    <p className="text-sm">{log.notes}</p>
                    {log.image_urls && log.image_urls.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {log.image_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted hover:opacity-80 transition-opacity overflow-hidden"
                          >
                            <img
                              src={url}
                              alt={`Site photo ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {log.blockers && (
                      <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                        <strong>Blocker:</strong> {log.blockers}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Payments Tab ──

function PaymentsTab({ project }: { project: Project }) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["client-transactions", project.id],
    queryFn: async () => {
      const res = await api.get(
        `/projects/${project.id}/transactions?category=INFLOW`
      )
      return res.data as Transaction[]
    },
  })

  const totalValue = project.total_project_value ?? 0
  const totalReceived = project.wallet?.total_received ?? 0
  const remaining = totalValue - totalReceived

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Project Value</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(totalReceived)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(remaining)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <IndianRupee className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No payment records found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium text-muted-foreground">Date</th>
                    <th className="pb-3 text-left font-medium text-muted-foreground">Description</th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">Amount</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">Status</th>
                    <th className="pb-3 text-center font-medium text-muted-foreground">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td className="py-3">{formatDate(txn.created_at)}</td>
                      <td className="py-3">{txn.description}</td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant={
                            txn.status === "CLEARED"
                              ? "success"
                              : txn.status === "PENDING"
                                ? "warning"
                                : "destructive"
                          }
                          className="text-[10px]"
                        >
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">
                        {txn.proof_doc_url ? (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={txn.proof_doc_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Documents Tab ──

function DocumentsTab({ project }: { project: Project }) {
  const { data: documents, isLoading } = useQuery({
    queryKey: ["client-documents", project.id],
    queryFn: async () => {
      const res = await api.get(`/projects/${project.id}/documents`)
      return res.data as ProjectDocument[]
    },
  })

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "DRAWING":
        return <ImageIcon className="h-5 w-5 text-blue-500" />
      case "CONTRACT":
        return <FileText className="h-5 w-5 text-purple-500" />
      case "INVOICE":
        return <IndianRupee className="h-5 w-5 text-green-500" />
      case "PHOTO":
        return <ImageIcon className="h-5 w-5 text-orange-500" />
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Project Documents</CardTitle>
        <CardDescription>
          View and download documents related to your project
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No documents shared yet. Documents will appear here as they become available.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 py-3"
              >
                {getCategoryIcon(doc.category)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {doc.category}
                    </Badge>
                    {doc.version > 1 && (
                      <span className="text-[10px] text-muted-foreground">
                        v{doc.version}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Page ──

export default function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  const {
    data: project,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["client-project", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`)
      return res.data as Project
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Unable to load project details.
        </p>
        <Button variant="outline" asChild>
          <Link href="/client-portal">Back to Projects</Link>
        </Button>
      </div>
    )
  }

  const statusConfig = (() => {
    switch (project.status) {
      case "IN_PROGRESS":
        return { label: "In Progress", variant: "default" as const }
      case "COMPLETED":
        return { label: "Completed", variant: "success" as const }
      case "ON_HOLD":
        return { label: "On Hold", variant: "warning" as const }
      case "NOT_STARTED":
        return { label: "Not Started", variant: "secondary" as const }
      default:
        return { label: project.status, variant: "secondary" as const }
    }
  })()

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/client-portal"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {project.client?.lead?.name ?? `Project #${project.id.slice(0, 8)}`}
          </h1>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          {formatDate(project.start_date)} &mdash; {formatDate(project.expected_end_date)}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab project={project} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab project={project} />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTab project={project} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

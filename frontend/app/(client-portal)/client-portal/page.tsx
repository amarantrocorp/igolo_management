"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Loader2,
  Calendar,
  IndianRupee,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import api from "@/lib/api"
import type { Project } from "@/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

function getStatusConfig(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return { label: "In Progress", variant: "default" as const, icon: Activity }
    case "COMPLETED":
      return { label: "Completed", variant: "success" as const, icon: CheckCircle2 }
    case "ON_HOLD":
      return { label: "On Hold", variant: "warning" as const, icon: AlertCircle }
    case "NOT_STARTED":
      return { label: "Not Started", variant: "secondary" as const, icon: Clock }
    default:
      return { label: status, variant: "secondary" as const, icon: Clock }
  }
}

function getProgressPercentage(project: Project): number {
  if (!project.sprints || project.sprints.length === 0) return 0
  const completedSprints = project.sprints.filter(
    (s) => s.status === "COMPLETED"
  ).length
  return Math.round((completedSprints / project.sprints.length) * 100)
}

function getCurrentSprint(project: Project) {
  if (!project.sprints) return null
  return (
    project.sprints.find((s) => s.status === "ACTIVE") ??
    project.sprints.find((s) => s.status === "PENDING") ??
    null
  )
}

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

export default function ClientPortalDashboard() {
  const router = useRouter()

  const {
    data: projects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["client-projects"],
    queryFn: async () => {
      const res = await api.get("/projects/my-projects")
      return res.data as Project[]
    },
  })

  // If only one project, redirect directly to its detail page
  useEffect(() => {
    if (projects && projects.length === 1) {
      router.replace(`/client-portal/${projects[0].id}`)
    }
  }, [projects, router])

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Unable to load your projects. Please try again later.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Calendar className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Projects Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your projects will appear here once they are set up by the team.
          </p>
        </div>
      </div>
    )
  }

  // If single project, we already redirect above; show loading
  if (projects.length === 1) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Your Projects</h1>
        <p className="text-muted-foreground mt-1">
          Select a project to view its details, timeline, and payments.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const statusConfig = getStatusConfig(project.status)
          const progress = getProgressPercentage(project)
          const currentSprint = getCurrentSprint(project)
          const totalReceived = project.wallet?.total_received ?? 0
          const totalValue = project.total_project_value ?? 0

          return (
            <Card
              key={project.id}
              className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/30"
              onClick={() => router.push(`/client-portal/${project.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {project.client?.lead?.name ?? `Project #${project.id.slice(0, 8)}`}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Started {formatDate(project.start_date)}
                    </CardDescription>
                  </div>
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Current Sprint */}
                {currentSprint && (
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium truncate">{currentSprint.name}</span>
                  </div>
                )}

                {/* Payment info */}
                <div className="flex items-center gap-2 text-sm">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Paid:</span>
                  <span className="font-medium">
                    {formatCurrency(totalReceived)} / {formatCurrency(totalValue)}
                  </span>
                </div>

                {/* Expected end */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Expected:</span>
                  <span className="font-medium">
                    {formatDate(project.expected_end_date)}
                  </span>
                </div>

                {/* View button */}
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-between group-hover:bg-primary/5"
                  >
                    View Project
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { format } from "date-fns"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import RoleGuard from "@/components/auth/role-guard"
import type { Project, ProjectStatus, Sprint } from "@/types"
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
  Building2,
  Calendar,
  IndianRupee,
  ArrowRight,
  Loader2,
  FolderKanban,
  CheckCircle,
  Clock,
} from "lucide-react"

const statusConfig: Record<ProjectStatus, { label: string; variant: "secondary" | "default" | "destructive" | "outline" ; className: string }> = {
  NOT_STARTED: { label: "Not Started", variant: "secondary", className: "bg-gray-100 text-gray-700 hover:bg-gray-100" },
  IN_PROGRESS: { label: "In Progress", variant: "default", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  ON_HOLD: { label: "On Hold", variant: "outline", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  COMPLETED: { label: "Completed", variant: "default", className: "bg-green-100 text-green-700 hover:bg-green-100" },
}

function getCompletedSprints(sprints: Sprint[] | undefined): number {
  if (!sprints) return 0
  return sprints.filter((s) => s.status === "COMPLETED").length
}

export default function ClientPortalPage() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["client-portal-projects"],
    queryFn: () => api.get("/projects").then((r) => r.data),
  })

  const totalProjects = projects?.length ?? 0
  const inProgress = projects?.filter((p) => p.status === "IN_PROGRESS").length ?? 0
  const completed = projects?.filter((p) => p.status === "COMPLETED").length ?? 0

  return (
    <RoleGuard allowedRoles={["CLIENT", "SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">
            Track your interior design projects
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Projects
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : totalProjects}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : inProgress}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "-" : completed}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && totalProjects === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                No projects found
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Your projects will appear here once they are created.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Project Cards */}
        {!isLoading && projects && projects.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const sprintsDone = getCompletedSprints(project.sprints)
              const totalSprints = project.sprints?.length ?? 6
              const progressPercent =
                totalSprints > 0
                  ? Math.round((sprintsDone / totalSprints) * 100)
                  : 0
              const cfg = statusConfig[project.status] ?? statusConfig.NOT_STARTED

              return (
                <Card key={project.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">
                        {project.client?.lead?.name ?? `Project`}
                      </CardTitle>
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                    </div>
                    {project.client?.address && (
                      <CardDescription className="line-clamp-1">
                        {project.client.address}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    {/* Sprint Progress */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Sprint Progress
                        </span>
                        <span className="font-medium">
                          {sprintsDone} of {totalSprints} completed
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-primary transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Expected:{" "}
                          {project.expected_end_date
                            ? format(
                                new Date(project.expected_end_date),
                                "dd MMM yyyy"
                              )
                            : "TBD"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IndianRupee className="h-4 w-4" />
                        <span>
                          {formatCurrency(project.total_project_value)}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Link href={`/dashboard/client-portal/${project.id}`}>
                      <Button variant="outline" className="w-full mt-2">
                        View Details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </RoleGuard>
  )
}

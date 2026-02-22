"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Project, ProjectStatus } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Loader2,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

function getStatusBadgeVariant(status: ProjectStatus) {
  switch (status) {
    case "NOT_STARTED":
      return "secondary" as const
    case "IN_PROGRESS":
      return "default" as const
    case "ON_HOLD":
      return "warning" as const
    case "COMPLETED":
      return "success" as const
    default:
      return "secondary" as const
  }
}

const columns: ColumnDef<Project>[] = [
  {
    id: "project_name",
    header: "Project",
    cell: ({ row }) => {
      const clientName =
        row.original.client?.user?.full_name ??
        row.original.client?.lead?.name ??
        "Unknown Client"
      return (
        <div>
          <span className="font-medium">{clientName}&apos;s Project</span>
          <p className="text-xs text-muted-foreground font-mono">
            PRJ-{row.original.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      )
    },
  },
  {
    id: "client",
    header: "Client",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.client?.user?.full_name ?? "N/A"}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={getStatusBadgeVariant(row.original.status)}>
        {row.original.status.replace("_", " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "start_date",
    header: "Start Date",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.start_date
          ? new Date(row.original.start_date).toLocaleDateString()
          : "--"}
      </span>
    ),
  },
  {
    accessorKey: "total_project_value",
    header: "Value",
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(row.original.total_project_value)}
      </span>
    ),
  },
  {
    id: "financial",
    header: "Received / Spent",
    cell: ({ row }) => {
      const wallet = row.original.wallet
      const received = Number(wallet?.total_received ?? 0)
      const spent = Number(wallet?.total_spent ?? 0)
      return (
        <div className="space-y-0.5">
          <p className="text-xs">
            <span className="text-green-600">
              {formatCurrency(received)}
            </span>{" "}
            received
          </p>
          <p className="text-xs">
            <span className="text-red-600">
              {formatCurrency(spent)}
            </span>{" "}
            spent
          </p>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Link href={`/dashboard/projects/${row.original.id}`}>
        <Button variant="ghost" size="sm">
          <ExternalLink className="mr-1 h-3 w-3" />
          View
        </Button>
      </Link>
    ),
  },
]

export default function ProjectsPage() {
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const response = await api.get("/projects")
      return response.data.items ?? response.data
    },
  })

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) return false
      return true
    })
  }, [projects, statusFilter])


  const table = useReactTable({
    data: filteredProjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  return (
    <RoleGuard
      allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}
    >
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FolderKanban className="h-6 w-6" />
            Projects
          </h2>
          <p className="text-muted-foreground">
            Manage active projects, sprints, and execution timelines
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderKanban className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No projects found</p>
                      <p className="text-xs text-muted-foreground">
                        Projects are created when a quotation is converted
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of{" "}
            {filteredProjects.length} project(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

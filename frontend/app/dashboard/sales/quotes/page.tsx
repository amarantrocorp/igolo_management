"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { useState } from "react"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Quotation, QuoteStatus } from "@/types"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Plus,
  ExternalLink,
} from "lucide-react"

function getStatusBadgeVariant(status: QuoteStatus) {
  switch (status) {
    case "DRAFT":
      return "secondary" as const
    case "SENT":
      return "default" as const
    case "APPROVED":
      return "success" as const
    case "REJECTED":
      return "destructive" as const
    case "ARCHIVED":
      return "outline" as const
    default:
      return "secondary" as const
  }
}

export default function QuotesPage() {
  const [globalFilter, setGlobalFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: quotes = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations"],
    queryFn: async () => {
      const response = await api.get("/quotes")
      return response.data.items ?? response.data
    },
  })

  const filteredQuotes = quotes.filter((quote) => {
    if (statusFilter !== "all" && quote.status !== statusFilter) return false
    return true
  })

  const columns: ColumnDef<Quotation>[] = [
    {
      accessorKey: "id",
      header: "Quote ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          QT-{row.original.id.slice(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      accessorKey: "lead",
      header: "Lead / Client",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.lead?.name ?? "Unknown"}
        </span>
      ),
    },
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => (
        <Badge variant="outline">v{row.original.version}</Badge>
      ),
    },
    {
      accessorKey: "total_amount",
      header: "Total Amount",
      cell: ({ row }) => (
        <span className="font-semibold">
          ${row.original.total_amount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={getStatusBadgeVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Link href={`/sales/quotes/${row.original.id}`}>
          <Button variant="ghost" size="sm">
            <ExternalLink className="mr-1 h-3 w-3" />
            Open
          </Button>
        </Link>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredQuotes,
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
      allowedRoles={["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <FileText className="h-6 w-6" />
              Quotations
            </h2>
            <p className="text-muted-foreground">
              Create, manage, and track client quotations
            </p>
          </div>

          <Link href="/sales/quotes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search quotations..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
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
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No quotations found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Create a new quotation from the button above
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
            {filteredQuotes.length} quotation(s)
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

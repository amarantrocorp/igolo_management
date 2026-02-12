"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
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
  Search,
  Loader2,
  FileText,
  Plus,
  ExternalLink,
} from "lucide-react"

const QUOTE_STATUSES: QuoteStatus[] = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
]

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

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]

export default function QuotesPage() {
  const userRole = useAuthStore((s) => s.user?.role)
  const canCreate = userRole !== "BDE"
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const { data: quotes = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["quotations"],
    queryFn: async () => {
      const response = await api.get("/quotes")
      return response.data.items ?? response.data
    },
  })

  const filteredQuotes = quotes.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        q.id.toLowerCase().includes(s) ||
        (q.lead?.name ?? "").toLowerCase().includes(s)
      )
    }
    return true
  })

  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
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

          {canCreate && (
            <Link href="/dashboard/sales/quotes/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Quote
              </Button>
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search quotations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Lead / Client</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredQuotes.length > 0 ? (
                filteredQuotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        QT-{q.id.slice(0, 8).toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      {q.lead?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{q.version}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {Number(q.total_amount).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(q.status)}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/sales/quotes/${q.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Open
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
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

        <p className="text-sm text-muted-foreground">
          Showing {filteredQuotes.length} of {quotes.length} quotation(s)
        </p>
      </div>
    </RoleGuard>
  )
}

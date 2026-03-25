"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Organization, UserRole } from "@/types"

interface PlatformUser {
  id: string
  email: string
  full_name: string
  role?: UserRole
  is_active: boolean
  is_platform_admin?: boolean
  created_at: string
  org_id?: string
  org_name?: string
}

const ROLES: UserRole[] = [
  "SUPER_ADMIN",
  "MANAGER",
  "BDE",
  "SALES",
  "SUPERVISOR",
  "CLIENT",
  "LABOR_LEAD",
]

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  MANAGER: "bg-purple-100 text-purple-700",
  BDE: "bg-blue-100 text-blue-700",
  SALES: "bg-emerald-100 text-emerald-700",
  SUPERVISOR: "bg-amber-100 text-amber-700",
  CLIENT: "bg-gray-100 text-gray-700",
  LABOR_LEAD: "bg-orange-100 text-orange-700",
}

const PAGE_SIZE = 15

function StatCard({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  iconBg: string
  iconColor: string
  borderColor: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 transition-all duration-200 hover:shadow-md",
        borderColor
      )}
    >
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-lg",
          iconBg
        )}
      >
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

export default function PlatformUsersPage() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [orgFilter, setOrgFilter] = useState<string>("ALL")
  const [page, setPage] = useState(1)

  const {
    data: users = [],
    isLoading: usersLoading,
    isError: usersError,
    error: usersErrorDetail,
  } = useQuery<PlatformUser[]>({
    queryKey: ["platform", "users"],
    queryFn: async () => {
      const { data } = await api.get("/users")
      return Array.isArray(data) ? data : []
    },
    staleTime: 30000,
    retry: 1,
  })

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["platform", "organizations"],
    queryFn: async () => {
      const { data } = await api.get("/platform/organizations")
      return data
    },
    staleTime: 30000,
  })

  const orgMap = useMemo(() => {
    const map: Record<string, string> = {}
    organizations.forEach((org) => {
      map[org.id] = org.name
    })
    return map
  }, [organizations])

  const filteredUsers = useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
    }
    if (roleFilter !== "ALL") {
      result = result.filter((u) => u.role === roleFilter)
    }
    if (orgFilter !== "ALL") {
      result = result.filter((u) => u.org_id === orgFilter)
    }
    return result
  }, [users, search, roleFilter, orgFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.is_active).length
  const inactiveUsers = totalUsers - activeUsers
  const newThisMonth = users.filter(
    (u) => new Date(u.created_at) >= monthStart
  ).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            All Platform Users
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">
          View and manage users across all organizations.
        </p>
      </div>

      {/* Stats Row */}
      {usersLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : usersError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-red-700">
            Failed to load users
          </p>
          <p className="mt-1 text-xs text-red-600">
            {(usersErrorDetail as Error)?.message?.includes("403")
              ? "You do not have permission to view platform users. SUPER_ADMIN role is required."
              : (usersErrorDetail as Error)?.message || "An unexpected error occurred. Please try again."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              title="Total Users"
              value={totalUsers}
              icon={Users}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              borderColor="border-indigo-100"
            />
            <StatCard
              title="Active Users"
              value={activeUsers}
              icon={UserCheck}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              borderColor="border-emerald-100"
            />
            <StatCard
              title="Inactive Users"
              value={inactiveUsers}
              icon={UserX}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              borderColor="border-red-100"
            />
            <StatCard
              title="New This Month"
              value={newThisMonth}
              icon={UserPlus}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              borderColor="border-blue-100"
            />
          </div>

          {/* Search + Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={orgFilter}
              onValueChange={(v) => {
                setOrgFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Org" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <div className="rounded-xl border bg-white">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  No users found
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow
                        key={user.id}
                        className="group transition-colors hover:bg-slate-50/50"
                      >
                        <TableCell className="font-medium">
                          {user.full_name}
                          {user.is_platform_admin && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px]"
                            >
                              Platform Admin
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {user.role ? (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                roleColors[user.role] || "bg-gray-100 text-gray-700"
                              )}
                            >
                              {user.role.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              --
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.org_id
                            ? orgMap[user.org_id] || user.org_name || "--"
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.is_active ? "default" : "secondary"}
                            className={cn(
                              "text-xs",
                              user.is_active
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  toast({
                                    title: "User Details",
                                    description: `Viewing ${user.full_name} (${user.email})`,
                                  })
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filteredUsers.length)} of{" "}
                    {filteredUsers.length} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

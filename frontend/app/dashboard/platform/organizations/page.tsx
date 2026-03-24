"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus,
  Building2,
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  Search,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  AlertTriangle,
  Mail,
  UserPlus,
} from "lucide-react"
import type { Organization, PlanTier, SubscriptionStatus, UserRole } from "@/types"

interface PlatformStats {
  total_organizations: number
  total_users: number
  active_projects: number
  active_trials: number
  paying_customers: number
  suspended_count: number
  mrr: number
  trial_conversion_rate: number
}

interface OrgMember {
  user_id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  joined_at: string
}

const statusColors: Record<string, string> = {
  TRIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PAST_DUE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
}

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  STARTER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PRO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  ENTERPRISE: "bg-gold/20 text-amber-700 dark:text-gold",
}

export default function PlatformOrganizationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterPlan, setFilterPlan] = useState<string>("ALL")
  const [filterStatus, setFilterStatus] = useState<string>("ALL")
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("SUPER_ADMIN")
  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    address: "",
    gst_number: "",
    plan_tier: "FREE" as PlanTier,
    admin_email: "",
  })

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["platform", "stats"],
    queryFn: async () => {
      const { data } = await api.get("/platform/stats")
      return data
    },
  })

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["platform", "organizations"],
    queryFn: async () => {
      const { data } = await api.get("/platform/organizations")
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: typeof newOrg) => {
      const { admin_email, ...orgPayload } = payload
      const { data } = await api.post("/platform/organizations", orgPayload)
      // If admin email provided, send invitation
      if (admin_email) {
        try {
          await api.post(`/platform/organizations/${data.id}/invite`, {
            email: admin_email,
            role: "SUPER_ADMIN",
          })
        } catch (inviteErr: any) {
          toast({
            title: "Org created but invitation failed",
            description: inviteErr.response?.data?.detail || "Could not send invitation",
            variant: "destructive",
          })
        }
      }
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      setCreateOpen(false)
      setNewOrg({ name: "", slug: "", address: "", gst_number: "", plan_tier: "FREE", admin_email: "" })
      toast({
        title: variables.admin_email
          ? "Organization created & admin invited"
          : "Organization created successfully",
      })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create organization",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async ({ orgId, email, role }: { orgId: string; email: string; role: string }) => {
      const { data } = await api.post(`/platform/organizations/${orgId}/invite`, {
        email,
        role,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      setInviteOpen(null)
      setInviteEmail("")
      setInviteRole("SUPER_ADMIN")
      toast({ title: "Invitation sent successfully" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send invitation",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await api.post(`/platform/organizations/${orgId}/suspend`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      toast({ title: "Organization suspended" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to suspend organization",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const activateMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const { data } = await api.post(`/platform/organizations/${orgId}/activate`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      toast({ title: "Organization activated" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to activate organization",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ orgId, plan }: { orgId: string; plan: string }) => {
      const { data } = await api.patch(`/platform/organizations/${orgId}/plan`, {
        plan_tier: plan,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      toast({ title: "Plan updated successfully" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to change plan",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (orgId: string) => {
      await api.delete(`/platform/organizations/${orgId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      toast({ title: "Organization deleted" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to delete organization",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const handleCreate = () => {
    if (!newOrg.name || !newOrg.slug) return
    const payload = {
      ...newOrg,
      address: newOrg.address || undefined,
      gst_number: newOrg.gst_number || undefined,
      admin_email: newOrg.admin_email || undefined,
    }
    createMutation.mutate(payload as typeof newOrg)
  }

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  // Filter organizations
  const filtered = organizations.filter((org) => {
    const matchesSearch =
      !searchQuery ||
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlan = filterPlan === "ALL" || org.plan_tier === filterPlan
    const matchesStatus =
      filterStatus === "ALL" ||
      (org.subscription_status || "TRIAL") === filterStatus
    return matchesSearch && matchesPlan && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Administration</h1>
          <p className="text-muted-foreground">
            Manage organizations across the platform
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Add a new organization to the platform.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={newOrg.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setNewOrg((prev) => ({
                      ...prev,
                      name,
                      slug: autoSlug(name),
                    }))
                  }}
                  placeholder="Acme Interiors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={newOrg.slug}
                  onChange={(e) =>
                    setNewOrg((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="acme-interiors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newOrg.address}
                  onChange={(e) =>
                    setNewOrg((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input
                  id="gst"
                  value={newOrg.gst_number}
                  onChange={(e) =>
                    setNewOrg((prev) => ({
                      ...prev,
                      gst_number: e.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin_email">Admin Email (optional)</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={newOrg.admin_email}
                  onChange={(e) =>
                    setNewOrg((prev) => ({ ...prev, admin_email: e.target.value }))
                  }
                  placeholder="admin@company.com — will receive an invitation"
                />
                <p className="text-xs text-muted-foreground">
                  If provided, this person will be invited as the org&apos;s SUPER_ADMIN.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan Tier</Label>
                <Select
                  value={newOrg.plan_tier}
                  onValueChange={(val) =>
                    setNewOrg((prev) => ({
                      ...prev,
                      plan_tier: val as PlanTier,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free</SelectItem>
                    <SelectItem value="STARTER">Starter</SelectItem>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={handleCreate}
                disabled={createMutation.isPending || !newOrg.name || !newOrg.slug}
              >
                {createMutation.isPending ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Enhanced Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Orgs</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_organizations}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.suspended_count} suspended
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_trials}</div>
              <p className="text-xs text-muted-foreground">
                {stats.trial_conversion_rate}% conversion
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Paying Customers
              </CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paying_customers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total_users} total users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.mrr)}
              </div>
              <p className="text-xs text-muted-foreground">
                Monthly recurring revenue
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_projects}</div>
              <p className="text-xs text-muted-foreground">Across all orgs</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                All organizations on the platform ({filtered.length} of{" "}
                {organizations.length})
              </CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Plans</SelectItem>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="PAST_DUE">Past Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Trial Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((org) => {
                  const subStatus = org.subscription_status || "TRIAL"
                  const isExpanded = expandedOrg === org.id
                  return (
                    <>
                      <TableRow
                        key={org.id}
                        className="cursor-pointer"
                        onClick={() =>
                          setExpandedOrg(isExpanded ? null : org.id)
                        }
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {org.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              planColors[org.plan_tier] || planColors.FREE
                            }`}
                          >
                            {org.plan_tier}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              statusColors[subStatus] || statusColors.TRIAL
                            }`}
                          >
                            {subStatus}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {org.max_users ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {org.max_projects ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(org.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {org.trial_expires_at
                            ? new Date(org.trial_expires_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedOrg(
                                    isExpanded ? null : org.id
                                  )
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Suspend / Activate */}
                              {subStatus === "SUSPENDED" ? (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    activateMutation.mutate(org.id)
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                  Activate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    suspendMutation.mutate(org.id)
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              {/* Change Plan sub-items */}
                              {(
                                ["FREE", "STARTER", "PRO", "ENTERPRISE"] as const
                              )
                                .filter((p) => p !== org.plan_tier)
                                .map((plan) => (
                                  <DropdownMenuItem
                                    key={plan}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      changePlanMutation.mutate({
                                        orgId: org.id,
                                        plan,
                                      })
                                    }}
                                  >
                                    <TrendingUp className="mr-2 h-4 w-4" />
                                    Switch to {plan}
                                  </DropdownMenuItem>
                                ))}

                              <DropdownMenuSeparator />

                              {/* Delete with confirmation */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Organization
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete{" "}
                                      <strong>{org.name}</strong> and all
                                      associated data. This action cannot be
                                      undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() =>
                                        deleteMutation.mutate(org.id)
                                      }
                                    >
                                      Delete Forever
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Detail Row */}
                      {isExpanded && (
                        <TableRow key={`${org.id}-details`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">
                                  Organization Details
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="text-muted-foreground">
                                      Slug:{" "}
                                    </span>
                                    {org.slug}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Address:{" "}
                                    </span>
                                    {org.address || "Not provided"}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      GST:{" "}
                                    </span>
                                    {org.gst_number || "Not provided"}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">
                                  Subscription
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="text-muted-foreground">
                                      Plan:{" "}
                                    </span>
                                    {org.plan_tier}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Status:{" "}
                                    </span>
                                    {subStatus}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Trial expires:{" "}
                                    </span>
                                    {org.trial_expires_at
                                      ? new Date(
                                          org.trial_expires_at
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Limits</h4>
                                <div className="space-y-1 text-sm">
                                  <p>
                                    <span className="text-muted-foreground">
                                      Max Users:{" "}
                                    </span>
                                    {org.max_users ?? 3}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Max Projects:{" "}
                                    </span>
                                    {org.max_projects ?? 2}
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">
                                      Active:{" "}
                                    </span>
                                    {org.is_active ? "Yes" : "No"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Members Section */}
                            <OrgMembersSection orgId={org.id} orgName={org.name} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      {searchQuery || filterPlan !== "ALL" || filterStatus !== "ALL"
                        ? "No organizations match your filters"
                        : "No organizations found"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ── Members Sub-Component ──

function OrgMembersSection({ orgId, orgName }: { orgId: string; orgName: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("SUPER_ADMIN")

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ["platform", "org-members", orgId],
    queryFn: async () => {
      const { data } = await api.get(`/platform/organizations/${orgId}/members`)
      // Normalize: backend may return nested ORM objects or flat dicts
      return data.map((m: any) => ({
        user_id: m.user_id || m.user?.id || m.id,
        full_name: m.full_name || m.user?.full_name || "",
        email: m.email || m.user?.email || "",
        role: m.role || "",
        is_active: m.is_active ?? true,
        joined_at: m.joined_at || m.created_at || "",
      }))
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data } = await api.post(`/platform/organizations/${orgId}/invite`, {
        email,
        role,
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "org-members", orgId] })
      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("SUPER_ADMIN")
      toast({ title: "Invitation sent successfully" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to send invitation",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/platform/organizations/${orgId}/members/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "org-members", orgId] })
      toast({ title: "Member removed" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to remove member",
        description: err.response?.data?.detail || "Unknown error",
        variant: "destructive",
      })
    },
  })

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">
            Members ({members.length})
          </h4>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member to {orgName}</DialogTitle>
              <DialogDescription>
                Send an invitation email. The recipient can register and join this organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inv-email">Email Address</Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="BDE">BDE</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!inviteEmail) return
                  inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
                }}
                disabled={inviteMutation.isPending || !inviteEmail}
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-center">
          <UserPlus className="mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No members yet. Invite someone to get started.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members
                .filter((m) => m.is_active)
                .map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="text-sm font-medium">
                      {member.full_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(member.joined_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <strong>{member.full_name}</strong> from this
                              organization? They will lose access immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => removeMutation.mutate(member.user_id)}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

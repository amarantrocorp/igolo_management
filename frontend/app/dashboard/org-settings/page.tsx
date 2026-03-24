"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import RoleGuard from "@/components/auth/role-guard"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Building2,
  Users,
  BarChart3,
  CreditCard,
  Loader2,
  UserPlus,
  UserX,
  Pencil,
  Save,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { UserRole } from "@/types"

// ── Types ──

interface OrgSettings {
  id: string
  name: string
  slug: string
  logo_url?: string
  address?: string
  gst_number?: string
  plan_tier: string
  subscription_status: string
  trial_expires_at?: string
  max_users: number
  max_projects: number
}

interface OrgMember {
  user_id: string
  full_name: string
  email: string
  role: UserRole
  is_active: boolean
  joined_at: string
}

interface OrgUsage {
  total_leads: number
  total_projects: number
  total_users: number
  storage_used_bytes: number
  limits: {
    max_users: number
    max_projects: number
    max_leads: number
    max_storage_bytes: number
  }
}

interface OrgBilling {
  plan_tier: string
  subscription_status: string
  trial_expires_at?: string
  days_remaining?: number
}

const ROLE_OPTIONS: UserRole[] = [
  "SUPER_ADMIN",
  "MANAGER",
  "BDE",
  "SALES",
  "SUPERVISOR",
]

function roleLabel(role: string) {
  return role.replace(/_/g, " ")
}

// ── Company Info Tab ──

function CompanyInfoTab() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery<OrgSettings>({
    queryKey: ["org-settings"],
    queryFn: async () => (await api.get("/org/settings")).data,
  })

  const [form, setForm] = useState<{
    name: string
    logo_url: string
    address: string
    gst_number: string
  } | null>(null)

  // Initialize form when data loads
  const formValues = form ?? {
    name: settings?.name ?? "",
    logo_url: settings?.logo_url ?? "",
    address: settings?.address ?? "",
    gst_number: settings?.gst_number ?? "",
  }

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return (await api.patch("/org/settings", data)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-settings"] })
      toast({ title: "Settings saved", description: "Organization settings updated successfully." })
      setForm(null)
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...formValues, ...prev, [field]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Information</CardTitle>
        <CardDescription>Manage your organization details visible across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={formValues.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gst-number">GST Number</Label>
            <Input
              id="gst-number"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={formValues.gst_number}
              onChange={(e) => handleChange("gst_number", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo-url">Logo URL</Label>
          <Input
            id="logo-url"
            placeholder="https://example.com/logo.png"
            value={formValues.logo_url}
            onChange={(e) => handleChange("logo_url", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Textarea
            id="address"
            rows={3}
            value={formValues.address}
            onChange={(e) => handleChange("address", e.target.value)}
          />
        </div>

        <Button
          onClick={() => updateMutation.mutate(formValues)}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Members Tab ──

function MembersTab() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<UserRole>("SALES")
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [editingRole, setEditingRole] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<UserRole>("SALES")

  const { data: members = [], isLoading } = useQuery<OrgMember[]>({
    queryKey: ["org-members"],
    queryFn: async () => (await api.get("/org/members")).data,
  })

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) =>
      (await api.post("/org/invite", data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({ title: "Invitation sent", description: `Invitation email sent to ${inviteEmail}.` })
      setInviteEmail("")
      setInviteRole("SALES")
      setShowInviteForm(false)
    },
    onError: (err: any) => {
      toast({
        title: "Failed to invite",
        description: err?.response?.data?.detail ?? "Could not send invitation.",
        variant: "destructive",
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => api.delete(`/org/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({ title: "Member removed" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail ?? "Failed to remove member.",
        variant: "destructive",
      })
    },
  })

  const roleChangeMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) =>
      (await api.patch(`/org/members/${userId}/role`, { role })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-members"] })
      toast({ title: "Role updated" })
      setEditingRole(null)
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail ?? "Failed to change role.",
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Manage who has access to your organization.</CardDescription>
        </div>
        <Button onClick={() => setShowInviteForm(!showInviteForm)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInviteForm && (
          <div className="flex items-end gap-3 rounded-lg border bg-muted/50 p-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-44 space-y-1">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => inviteMutation.mutate({ email: inviteEmail, role: inviteRole })}
              disabled={!inviteEmail || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Invite"
              )}
            </Button>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.user_id}>
                <TableCell className="font-medium">{m.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  {editingRole === m.user_id ? (
                    <div className="flex items-center gap-2">
                      <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabel(r)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          roleChangeMutation.mutate({ userId: m.user_id, role: newRole })
                        }
                        disabled={roleChangeMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRole(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary">{roleLabel(m.role)}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? "default" : "destructive"}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {m.user_id !== user?.id && m.is_active && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Change role"
                        onClick={() => {
                          setEditingRole(m.user_id)
                          setNewRole(m.role)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Remove member">
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove{" "}
                              <strong>{m.full_name}</strong> from the organization? They
                              will lose access immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeMutation.mutate(m.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ── Usage Tab ──

function UsageBar({
  label,
  used,
  total,
  unit,
}: {
  label: string
  used: number
  total: number
  unit?: string
}) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const color =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-yellow-500" : "bg-primary"

  const formatVal = (v: number) => {
    if (unit === "GB") return `${(v / (1024 * 1024 * 1024)).toFixed(1)} GB`
    return v.toLocaleString()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatVal(used)} / {formatVal(total)} {unit !== "GB" ? "used" : ""}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{pct}% used</p>
    </div>
  )
}

function UsageTab() {
  const router = useRouter()
  const { data: usage, isLoading } = useQuery<OrgUsage>({
    queryKey: ["org-usage"],
    queryFn: async () => (await api.get("/org/usage")).data,
  })

  if (isLoading || !usage) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const nearLimit =
    usage.total_users >= usage.limits.max_users * 0.9 ||
    usage.total_projects >= usage.limits.max_projects * 0.9 ||
    usage.total_leads >= usage.limits.max_leads * 0.9

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Usage Overview</CardTitle>
          <CardDescription>Track your organization&apos;s resource consumption.</CardDescription>
        </div>
        {nearLimit && (
          <Button variant="outline" onClick={() => router.push("/dashboard/billing")}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <UsageBar
          label="Team Members"
          used={usage.total_users}
          total={usage.limits.max_users}
        />
        <UsageBar
          label="Projects"
          used={usage.total_projects}
          total={usage.limits.max_projects}
        />
        <UsageBar
          label="Leads"
          used={usage.total_leads}
          total={usage.limits.max_leads}
        />
        <UsageBar
          label="Storage"
          used={usage.storage_used_bytes}
          total={usage.limits.max_storage_bytes}
          unit="GB"
        />
      </CardContent>
    </Card>
  )
}

// ── Billing Tab ──

function BillingTab() {
  const router = useRouter()
  const { data: billing, isLoading } = useQuery<OrgBilling>({
    queryKey: ["org-billing"],
    queryFn: async () => (await api.get("/org/billing")).data,
  })

  if (isLoading || !billing) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    TRIAL: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-green-100 text-green-800",
    PAST_DUE: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    SUSPENDED: "bg-orange-100 text-orange-800",
  }

  return (
    <div className="space-y-4">
      {billing.subscription_status === "PAST_DUE" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Payment Past Due</p>
            <p className="text-sm text-muted-foreground">
              Your subscription payment is overdue. Please update your billing to avoid service interruption.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription and billing details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{billing.plan_tier}</p>
              <Badge className={statusColor[billing.subscription_status] ?? ""}>
                {billing.subscription_status}
              </Badge>
            </div>
          </div>

          {billing.subscription_status === "TRIAL" && billing.days_remaining !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Trial Period</span>
                <span className="text-muted-foreground">
                  {billing.days_remaining} days remaining
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${
                    (billing.days_remaining ?? 0) <= 3 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.max(0, 100 - ((billing.days_remaining ?? 0) / 14) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {billing.trial_expires_at && (
            <p className="text-sm text-muted-foreground">
              {billing.subscription_status === "TRIAL" ? "Trial expires" : "Expired"} on{" "}
              {new Date(billing.trial_expires_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}

          <Button onClick={() => router.push("/dashboard/billing")}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Main Page ──

export default function OrgSettingsPage() {
  const { roleInOrg } = useAuthStore()
  const isSuperAdmin = roleInOrg === "SUPER_ADMIN"

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization profile, team, and subscription.
          </p>
        </div>

        <Tabs defaultValue="company" className="space-y-4">
          <TabsList>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Company Info
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="billing" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="company">
            <CompanyInfoTab />
          </TabsContent>
          <TabsContent value="members">
            <MembersTab />
          </TabsContent>
          <TabsContent value="usage">
            <UsageTab />
          </TabsContent>
          {isSuperAdmin && (
            <TabsContent value="billing">
              <BillingTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </RoleGuard>
  )
}

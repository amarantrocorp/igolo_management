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
import { useToast } from "@/components/ui/use-toast"
import { Plus, Building2, Users, FolderKanban } from "lucide-react"
import type { Organization, PlanTier } from "@/types"

interface PlatformStats {
  total_organizations: number
  total_users: number
  active_projects: number
}

export default function PlatformOrganizationsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [newOrg, setNewOrg] = useState({
    name: "",
    slug: "",
    address: "",
    gst_number: "",
    plan_tier: "FREE" as PlanTier,
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
      const { data } = await api.post("/platform/organizations", payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform"] })
      setCreateOpen(false)
      setNewOrg({ name: "", slug: "", address: "", gst_number: "", plan_tier: "FREE" })
      toast({ title: "Organization created successfully" })
    },
    onError: (err: any) => {
      toast({
        title: "Failed to create organization",
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
    }
    createMutation.mutate(payload as typeof newOrg)
  }

  const autoSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Organizations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_organizations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
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
              <div className="text-2xl font-bold">
                {stats.active_projects}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            All organizations on the platform
          </CardDescription>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.slug}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{org.plan_tier}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={org.is_active ? "default" : "destructive"}
                      >
                        {org.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </TableCell>
                  </TableRow>
                ))}
                {organizations.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      No organizations found
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

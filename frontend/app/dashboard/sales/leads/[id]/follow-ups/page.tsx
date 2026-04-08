"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { useAuthStore } from "@/store/auth-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  ArrowLeft,
  Plus,
  X,
  Clock,
  History,
  Phone,
  MapPin,
  Mail,
  Users as UsersIcon,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Bell,
} from "lucide-react"
import type { User } from "@/types"

// ── Types ──

interface FollowUp {
  id: string
  lead_id: string
  lead_name: string
  type: string
  scheduled_date: string
  scheduled_time: string | null
  assigned_to_id: string
  assigned_to_name: string
  notes: string | null
  status: string
  reminder: boolean
  completed_at: string | null
  outcome_notes: string | null
  created_at: string
}

interface Lead {
  id: string
  name: string
  contact_number: string
  email?: string
}

const TYPE_BADGE: Record<string, { label: string; icon: typeof Phone; color: string }> = {
  CALL: { label: "Call", icon: Phone, color: "bg-blue-50 text-blue-700 border-blue-200" },
  SITE_VISIT: { label: "Site Visit", icon: MapPin, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  MEETING: { label: "Meeting", icon: UsersIcon, color: "bg-violet-50 text-violet-700 border-violet-200" },
  EMAIL: { label: "Email", icon: Mail, color: "bg-amber-50 text-amber-700 border-amber-200" },
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
  RESCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
}

// ── Main Page ──

export default function FollowUpsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const leadId = params.id as string

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: "CALL",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "12:30",
    assigned_to_id: "",
    notes: "",
    reminder: true,
  })

  // Fetch lead info
  const { data: lead } = useQuery<Lead>({
    queryKey: ["lead", leadId],
    queryFn: async () => (await api.get(`/crm/leads/${leadId}`)).data,
  })

  // Fetch follow-ups
  const { data: followUps = [], isLoading } = useQuery<FollowUp[]>({
    queryKey: ["follow-ups", leadId],
    queryFn: async () => (await api.get(`/crm/follow-ups?lead_id=${leadId}`)).data,
  })

  // Fetch users for assignment — always include current user as fallback
  const currentUser = useAuthStore((s) => s.user)
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users-for-followup"],
    queryFn: async () => {
      try {
        const res = await api.get("/users?limit=100")
        const all = res.data.items ?? res.data ?? []
        const filtered = all.filter((u: User) =>
          ["BDE", "SALES"].includes(u.role ?? "")
        )
        // Ensure current user is always in the list
        if (currentUser && !filtered.some((u: User) => u.id === currentUser.id)) {
          filtered.unshift(currentUser)
        }
        return filtered
      } catch {
        // Fallback to just current user if /users endpoint fails
        return currentUser ? [currentUser] : []
      }
    },
  })

  // Create follow-up
  const createMutation = useMutation({
    mutationFn: async () => {
      return (await api.post("/crm/follow-ups", {
        lead_id: leadId,
        type: formData.type,
        scheduled_date: formData.scheduled_date,
        scheduled_time: formData.scheduled_time || null,
        assigned_to_id: formData.assigned_to_id,
        notes: formData.notes || null,
        reminder: formData.reminder,
      })).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups", leadId] })
      toast({ title: "Follow-up scheduled" })
      setShowForm(false)
      setFormData({
        type: "CALL",
        scheduled_date: new Date().toISOString().split("T")[0],
        scheduled_time: "12:30",
        assigned_to_id: "",
        notes: "",
        reminder: true,
      })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail ?? "Failed to create follow-up",
        variant: "destructive",
      })
    },
  })

  // Complete follow-up
  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/crm/follow-ups/${id}/complete`)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups", leadId] })
      toast({ title: "Follow-up marked as completed" })
    },
  })

  const pendingFollowUps = followUps.filter((f) => f.status === "PENDING")
  const completedFollowUps = followUps.filter((f) => f.status !== "PENDING")
  const leadIdShort = `LD-${lead?.id?.slice(-10).toUpperCase() ?? ""}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/sales/leads/${leadId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Follow-ups</h1>
            <p className="text-sm text-muted-foreground">
              Managing follow-ups for Lead {leadIdShort}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/sales/leads/${leadId}`)}>
            Back to Lead
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Follow-up
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* New Follow-up Form */}
          {showForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  New Follow-up
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Lead Name</Label>
                  <Select value={leadId} disabled>
                    <SelectTrigger><SelectValue placeholder={lead?.name ?? "Loading..."} /></SelectTrigger>
                    <SelectContent><SelectItem value={leadId}>{lead?.name}</SelectItem></SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time</Label>
                    <Input
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CALL">Call</SelectItem>
                      <SelectItem value="SITE_VISIT">Site Visit</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Assigned To</Label>
                  <Select value={formData.assigned_to_id} onValueChange={(v) => setFormData({ ...formData, assigned_to_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    placeholder="Agenda or things to discuss..."
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <div
                      className={`relative w-10 h-5 rounded-full transition-colors ${formData.reminder ? "bg-blue-600" : "bg-gray-300"}`}
                      onClick={() => setFormData({ ...formData, reminder: !formData.reminder })}
                    >
                      <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${formData.reminder ? "translate-x-5" : "translate-x-0.5"}`} />
                    </div>
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    Reminder
                  </label>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={!formData.assigned_to_id || !formData.scheduled_date || createMutation.isPending}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                Follow-up History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedFollowUps.length > 0 ? (
                <div className="space-y-3">
                  {completedFollowUps.map((f) => {
                    const typeCfg = TYPE_BADGE[f.type] ?? TYPE_BADGE.CALL
                    return (
                      <div key={f.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                        <div className={`mt-0.5 rounded-md p-1.5 ${typeCfg.color}`}>
                          <typeCfg.icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{typeCfg.label} — {f.scheduled_date}</p>
                          <p className="text-xs text-muted-foreground">{f.assigned_to_name}</p>
                          {f.outcome_notes && <p className="text-xs mt-1">{f.outcome_notes}</p>}
                        </div>
                        <Badge variant="outline" className={STATUS_BADGE[f.status] ?? ""}>
                          {f.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No follow-up history.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Upcoming Follow-ups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingFollowUps.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Lead & Details</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingFollowUps.map((f) => {
                    const typeCfg = TYPE_BADGE[f.type] ?? TYPE_BADGE.CALL
                    return (
                      <TableRow key={f.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{f.scheduled_date}</p>
                          {f.scheduled_time && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {f.scheduled_time}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-blue-600">{lead?.name ?? f.lead_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeCfg.color}`}>
                              <typeCfg.icon className="h-2.5 w-2.5 mr-0.5" />
                              {typeCfg.label}
                            </Badge>
                            {f.notes && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                • {f.notes}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">
                              {f.assigned_to_name?.charAt(0) ?? "?"}
                            </div>
                            <span className="text-sm">{f.assigned_to_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[f.status] ?? ""}>
                            {f.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => completeMutation.mutate(f.id)}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No upcoming follow-ups. Click &quot;+ Add Follow-up&quot; to schedule one.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

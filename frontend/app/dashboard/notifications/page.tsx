"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import RoleGuard from "@/components/auth/role-guard"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
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
  Bell,
  Settings,
  CheckCheck,
  Search,
  AlertCircle,
  Clock,
  ShoppingCart,
  Receipt,
  Truck,
  Flag,
  CalendarClock,
  IndianRupee,
} from "lucide-react"
import { Input } from "@/components/ui/input"

// ── Types ──

type NotificationType =
  | "Task Reminder"
  | "Follow-up"
  | "Purchase Approval"
  | "Expense Approval"
  | "Material Delivery"
  | "Issue Reported"
  | "Project Deadline"
  | "Client Payment"

type Priority = "Low" | "Medium" | "High" | "Critical"
type ReadStatus = "Unread" | "Read"

interface Notification {
  id: string
  message: string
  type: NotificationType
  project: string
  triggeredBy: string
  priority: Priority
  date: string
  status: ReadStatus
}

const NOTIFICATION_TYPES: NotificationType[] = [
  "Task Reminder",
  "Follow-up",
  "Purchase Approval",
  "Expense Approval",
  "Material Delivery",
  "Issue Reported",
  "Project Deadline",
  "Client Payment",
]

const PRIORITIES: Priority[] = ["Low", "Medium", "High", "Critical"]

// Map API notification type to display type
function mapNotificationType(apiType: string): NotificationType {
  const typeMap: Record<string, NotificationType> = {
    ALERT: "Issue Reported",
    APPROVAL_REQ: "Purchase Approval",
    INFO: "Task Reminder",
    PAYMENT_RECEIVED: "Client Payment",
  }
  return typeMap[apiType] || "Task Reminder"
}

// Map API notification to display format
function mapApiNotification(n: any): Notification {
  const createdAt = new Date(n.created_at)
  const dateStr = createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) + ", " + createdAt.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  return {
    id: n.id,
    message: n.body || n.title || "Notification",
    type: mapNotificationType(n.type),
    project: n.action_url ? "—" : "—",
    triggeredBy: "System",
    priority: n.type === "ALERT" ? "High" : "Medium",
    date: dateStr,
    status: n.is_read ? "Read" : "Unread",
  }
}

// ── Helpers ──

function getTypeIcon(type: NotificationType) {
  switch (type) {
    case "Task Reminder":
      return <Clock className="h-3.5 w-3.5" />
    case "Follow-up":
      return <Clock className="h-3.5 w-3.5" />
    case "Purchase Approval":
      return <ShoppingCart className="h-3.5 w-3.5" />
    case "Expense Approval":
      return <Receipt className="h-3.5 w-3.5" />
    case "Material Delivery":
      return <Truck className="h-3.5 w-3.5" />
    case "Issue Reported":
      return <AlertCircle className="h-3.5 w-3.5" />
    case "Project Deadline":
      return <CalendarClock className="h-3.5 w-3.5" />
    case "Client Payment":
      return <IndianRupee className="h-3.5 w-3.5" />
  }
}

function getTypeBadgeColor(type: NotificationType) {
  switch (type) {
    case "Task Reminder":
      return "bg-blue-100 text-blue-700"
    case "Follow-up":
      return "bg-violet-100 text-violet-700"
    case "Purchase Approval":
      return "bg-amber-100 text-amber-700"
    case "Expense Approval":
      return "bg-orange-100 text-orange-700"
    case "Material Delivery":
      return "bg-cyan-100 text-cyan-700"
    case "Issue Reported":
      return "bg-red-100 text-red-700"
    case "Project Deadline":
      return "bg-rose-100 text-rose-700"
    case "Client Payment":
      return "bg-emerald-100 text-emerald-700"
  }
}

function getPriorityBadge(priority: Priority) {
  switch (priority) {
    case "Low":
      return (
        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Low</Badge>
      )
    case "Medium":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Medium</Badge>
      )
    case "High":
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">High</Badge>
      )
    case "Critical":
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Critical</Badge>
      )
  }
}

// ── Component ──

export default function NotificationsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])

  const { data: apiNotifications = [] } = useQuery<any[]>({
    queryKey: ["notifications-page"],
    queryFn: async () => {
      const res = await api.get("/notifications?limit=50")
      return res.data.items ?? res.data ?? []
    },
  })

  // Sync API data into local state for mark-all-read support
  useEffect(() => {
    if (apiNotifications.length > 0) {
      setNotifications(apiNotifications.map(mapApiNotification))
    }
  }, [apiNotifications])

  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false
    if (priorityFilter !== "all" && n.priority !== priorityFilter) return false
    if (search && !n.message.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const unreadCount = notifications.filter((n) => n.status === "Unread").length

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "Read" as ReadStatus })))
    // Also call API to mark all as read
    try {
      await api.post("/notifications/mark-all-read")
    } catch { /* ignore */ }
    // Invalidate the bell badge unread count so the header updates
    queryClient.invalidateQueries({ queryKey: ["notifications"] })
    toast({ title: "Done", description: "All notifications marked as read" })
  }

  return (
    <RoleGuard
      allowedRoles={[
        "SUPER_ADMIN",
        "MANAGER",
        "BDE",
        "SALES",
        "SUPERVISOR",
        "LABOR_LEAD",
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={Bell}
          title="Notifications"
          subtitle="Manage system alerts, reminders, and approvals"
          gradient="linear-gradient(135deg, #3b82f6, #2563eb)"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => router.push("/dashboard/settings")}>
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
            </div>
          }
        />

        {/* Unread indicator */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {NOTIFICATION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[400px]">Notification</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Triggered By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNotifications.map((notif) => (
                <TableRow
                  key={notif.id}
                  className={notif.status === "Unread" ? "bg-blue-50/40" : ""}
                >
                  <TableCell className="pr-0">
                    {notif.status === "Unread" ? (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500" />
                    ) : (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-gray-300" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <p
                        className={`text-sm leading-snug ${
                          notif.status === "Unread" ? "font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {notif.message}
                      </p>
                      <Badge
                        variant="outline"
                        className={`gap-1 text-[10px] ${getTypeBadgeColor(notif.type)}`}
                      >
                        {getTypeIcon(notif.type)}
                        {notif.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {notif.project}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {notif.triggeredBy}
                  </TableCell>
                  <TableCell>{getPriorityBadge(notif.priority)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {notif.date}
                  </TableCell>
                </TableRow>
              ))}

              {filteredNotifications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {notifications.length === 0 ? "No notifications yet" : "No notifications found matching the selected filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </RoleGuard>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check, CheckCheck } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { Notification } from "@/types"

export default function NotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // Poll unread count every 60 seconds
  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count")
      return res.data as { count: number }
    },
    refetchInterval: 60000,
  })

  // Fetch recent notifications when popover opens
  const { data: notifications } = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await api.get("/notifications?limit=20")
      return res.data as Notification[]
    },
    refetchInterval: 60000,
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/mark-all-read")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const unreadCount = countData?.count ?? 0

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id)
    }
    if (notification.action_url) {
      router.push(notification.action_url)
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "APPROVAL_REQ":
        return <Badge variant="destructive" className="text-[9px] px-1 h-4">Approval</Badge>
      case "ALERT":
        return <Badge variant="destructive" className="text-[9px] px-1 h-4">Alert</Badge>
      case "PAYMENT_RECEIVED":
        return <Badge className="text-[9px] px-1 h-4 bg-green-600">Payment</Badge>
      default:
        return <Badge variant="secondary" className="text-[9px] px-1 h-4">Info</Badge>
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllReadMutation.mutate()}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          {(!notifications || notifications.length === 0) ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                    !n.is_read ? "bg-blue-50 dark:bg-blue-950/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">
                          {n.title}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.body}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getTypeBadge(n.type)}
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

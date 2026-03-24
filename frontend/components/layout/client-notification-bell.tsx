"use client"

import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
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

export default function ClientNotificationBell() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await api.get("/notifications/unread-count")
      return res.data as { count: number }
    },
    refetchInterval: 60000,
  })

  const { data: notifications } = useQuery({
    queryKey: ["notifications", "list", "client"],
    queryFn: async () => {
      const res = await api.get("/notifications?limit=5")
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

  const unreadCount = countData?.count ?? 0

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id)
    }
    if (notification.action_url) {
      // Rewrite dashboard URLs to client portal URLs
      const url = notification.action_url.replace(/^\/dashboard/, "")
      router.push(url || "/client-portal")
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
        <div className="border-b px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
        </div>
        <ScrollArea className="h-[280px]">
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
                  <div className="flex items-start gap-2">
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.body}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {formatTime(n.created_at)}
                      </span>
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

"use client"

import { useRouter } from "next/navigation"
import { Sparkles, LogOut } from "lucide-react"
import { useAuthStore } from "@/store/auth-store"
import ClientGuard from "@/components/auth/client-guard"
import ClientNotificationBell from "@/components/layout/client-notification-bell"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function ClientPortalNavbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/client-login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-gold" />
          <span className="font-serif text-lg font-bold">Igolo Interior</span>
          <span className="ml-2 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
            Client Portal
          </span>
        </div>

        {/* Right: Notifications + Avatar */}
        <div className="flex items-center gap-3">
          <ClientNotificationBell />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:block">
                    {user.full_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}

function ClientPortalFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium">Igolo Interior</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Need help? Contact us at{" "}
            <a
              href="mailto:support@igolointerior.com"
              className="font-medium text-primary hover:underline"
            >
              support@igolointerior.com
            </a>{" "}
            or call{" "}
            <a href="tel:+911234567890" className="font-medium text-primary hover:underline">
              +91 123 456 7890
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClientGuard>
      <div className="flex min-h-screen flex-col bg-white">
        <ClientPortalNavbar />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <ClientPortalFooter />
      </div>
    </ClientGuard>
  )
}

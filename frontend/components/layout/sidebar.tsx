"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/store/auth-store"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import type { UserRole } from "@/types"
import {
  LayoutDashboard,
  Users,
  FileText,
  FolderKanban,
  Package,
  ShoppingCart,
  DollarSign,
  HardHat,
  UserCog,
  Store,
  ClipboardList,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["SUPER_ADMIN", "MANAGER", "BDE", "SALES", "SUPERVISOR"],
      },
    ],
  },
  {
    label: "Sales",
    items: [
      {
        title: "Leads",
        href: "/dashboard/sales/leads",
        icon: Users,
        roles: ["BDE", "SALES", "MANAGER", "SUPER_ADMIN"],
      },
      {
        title: "Quotes",
        href: "/dashboard/sales/quotes",
        icon: FileText,
        roles: ["BDE", "SALES", "MANAGER", "SUPER_ADMIN"],
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Projects",
        href: "/dashboard/projects",
        icon: FolderKanban,
        roles: ["MANAGER", "SUPERVISOR", "SUPER_ADMIN"],
      },
      {
        title: "Inventory",
        href: "/dashboard/admin/inventory",
        icon: Package,
        roles: ["MANAGER", "SUPER_ADMIN"],
      },
      {
        title: "Purchase Orders",
        href: "/dashboard/admin/purchase-orders",
        icon: ShoppingCart,
        roles: ["MANAGER", "SUPER_ADMIN"],
      },
      {
        title: "Finance",
        href: "/dashboard/admin/finance",
        icon: DollarSign,
        roles: ["MANAGER", "SUPER_ADMIN"],
      },
      {
        title: "Labor Teams",
        href: "/dashboard/admin/labor",
        icon: HardHat,
        roles: ["MANAGER", "SUPERVISOR", "SUPER_ADMIN"],
      },
      {
        title: "Payroll",
        href: "/dashboard/admin/payroll",
        icon: ClipboardList,
        roles: ["MANAGER", "SUPER_ADMIN"],
      },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Users",
        href: "/dashboard/admin/users",
        icon: UserCog,
        roles: ["SUPER_ADMIN"],
      },
      {
        title: "Vendors",
        href: "/dashboard/admin/vendors",
        icon: Store,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
  {
    label: "Client",
    items: [
      {
        title: "My Projects",
        href: "/dashboard/client-portal",
        icon: Building2,
        roles: ["CLIENT"],
      },
      {
        title: "Payments",
        href: "/dashboard/client-portal/payments",
        icon: ClipboardList,
        roles: ["CLIENT"],
      },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.roles.includes(user.role as UserRole)
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <span className="font-serif text-lg font-bold text-sidebar-foreground">
              Igolo
            </span>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <Sparkles className="h-5 w-5 text-gold" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-4 px-2">
          {filteredSections.map((section) => (
            <div key={section.label}>
              {!collapsed ? (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {section.label}
                </p>
              ) : (
                <Separator className="mx-auto mb-2 w-8 bg-sidebar-border" />
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon
                  return (
                    <li key={item.href} className="relative">
                      {isActive && (
                        <div className="absolute inset-0 rounded-md bg-sidebar-accent" />
                      )}
                      <Link
                        href={item.href}
                        className={cn(
                          "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.title : undefined}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!collapsed && (
                          <span className="overflow-hidden whitespace-nowrap">
                            {item.title}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border bg-background text-foreground shadow-sm hover:bg-accent"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  )
}

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
  Building2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Truck,
  CreditCard,
  BarChart3,
  Settings,
  TrendingUp,
  ClipboardCheck,
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

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER"]
const SALES_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]
const OPS_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]
const ALL_INTERNAL: UserRole[] = ["SUPER_ADMIN", "MANAGER", "BDE", "SALES", "SUPERVISOR"]

const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_INTERNAL,
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
        roles: SALES_ROLES,
      },
      {
        title: "Quotations",
        href: "/dashboard/sales/quotes",
        icon: FileText,
        roles: SALES_ROLES,
      },
    ],
  },
  {
    label: "Projects",
    items: [
      {
        title: "All Projects",
        href: "/dashboard/projects",
        icon: FolderKanban,
        roles: OPS_ROLES,
      },
      {
        title: "Execution",
        href: "/dashboard/execution-tracking",
        icon: Truck,
        roles: OPS_ROLES,
      },
      {
        title: "Labour",
        href: "/dashboard/admin/labor",
        icon: HardHat,
        roles: OPS_ROLES,
      },
    ],
  },
  {
    label: "Procurement",
    items: [
      {
        title: "Inventory",
        href: "/dashboard/admin/inventory",
        icon: Package,
        roles: ADMIN_ROLES,
      },
      {
        title: "Purchase Orders",
        href: "/dashboard/admin/purchase-orders",
        icon: ShoppingCart,
        roles: ADMIN_ROLES,
      },
      {
        title: "Approvals",
        href: "/dashboard/admin/approvals",
        icon: ClipboardCheck,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Accounts",
        href: "/dashboard/admin/finance",
        icon: DollarSign,
        roles: ADMIN_ROLES,
      },
      {
        title: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
        roles: ADMIN_ROLES,
      },
      {
        title: "Settings",
        href: "/dashboard/org-settings",
        icon: Settings,
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    label: "Client Portal",
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
        icon: CreditCard,
        roles: ["CLIENT"],
      },
    ],
  },
]

const platformSection: NavSection = {
  label: "Platform",
  items: [
    {
      title: "Dashboard",
      href: "/dashboard/platform",
      icon: LayoutDashboard,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Organizations",
      href: "/dashboard/platform/organizations",
      icon: Shield,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "All Users",
      href: "/dashboard/platform/users",
      icon: Users,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Revenue",
      href: "/dashboard/platform/revenue",
      icon: TrendingUp,
      roles: ["SUPER_ADMIN"],
    },
    {
      title: "Settings",
      href: "/dashboard/platform/settings",
      icon: Settings,
      roles: ["SUPER_ADMIN"],
    },
  ],
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, roleInOrg } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const effectiveRole = roleInOrg ?? user.role

  const allSections = user.is_platform_admin
    ? [platformSection]
    : navSections

  const filteredSections = allSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        effectiveRole ? item.roles.includes(effectiveRole as UserRole) : false
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
                  const isActive = item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/")
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

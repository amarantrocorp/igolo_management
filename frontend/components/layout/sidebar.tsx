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
  Hammer,
  Wrench,
  Receipt,
  Shield,
  ClipboardCheck,
  Ruler,
  MapPin,
  Palette,
  PenTool,
  Calculator,
  CheckSquare,
  Truck,
  CreditCard,
  BarChart3,
  Bell,
  Settings,
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
    label: "Main Menu",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ALL_INTERNAL,
      },
      {
        title: "Lead Management",
        href: "/dashboard/sales/leads",
        icon: Users,
        roles: SALES_ROLES,
      },
      {
        title: "Client Requirements",
        href: "/dashboard/client-requirements",
        icon: ClipboardCheck,
        roles: SALES_ROLES,
      },
      {
        title: "Site Survey",
        href: "/dashboard/site-survey",
        icon: MapPin,
        roles: OPS_ROLES,
      },
      {
        title: "Design Concepts",
        href: "/dashboard/design-concepts",
        icon: Palette,
        roles: OPS_ROLES,
      },
      {
        title: "Drawings",
        href: "/dashboard/drawings",
        icon: PenTool,
        roles: OPS_ROLES,
      },
      {
        title: "Smart Quotation",
        href: "/dashboard/sales/quotes",
        icon: FileText,
        roles: SALES_ROLES,
      },
      {
        title: "BOQ & Estimates",
        href: "/dashboard/boq",
        icon: Calculator,
        roles: SALES_ROLES,
      },
      {
        title: "Budget Approval",
        href: "/dashboard/budget-approval",
        icon: CheckSquare,
        roles: ADMIN_ROLES,
      },
      {
        title: "Projects",
        href: "/dashboard/projects",
        icon: FolderKanban,
        roles: OPS_ROLES,
      },
      {
        title: "Material Planning",
        href: "/dashboard/material-planning",
        icon: Package,
        roles: ADMIN_ROLES,
      },
      {
        title: "Vendors",
        href: "/dashboard/admin/vendors",
        icon: Store,
        roles: ADMIN_ROLES,
      },
      {
        title: "Purchasing",
        href: "/dashboard/purchasing",
        icon: ShoppingCart,
        roles: ADMIN_ROLES,
      },
      {
        title: "Labour Management",
        href: "/dashboard/labour",
        icon: HardHat,
        roles: OPS_ROLES,
      },
      {
        title: "Execution Tracking",
        href: "/dashboard/execution-tracking",
        icon: Truck,
        roles: OPS_ROLES,
      },
      {
        title: "Expenses",
        href: "/dashboard/expenses",
        icon: DollarSign,
        roles: ADMIN_ROLES,
      },
      {
        title: "Client Billing",
        href: "/dashboard/client-billing",
        icon: CreditCard,
        roles: ADMIN_ROLES,
      },
      {
        title: "Reports",
        href: "/dashboard/reports",
        icon: BarChart3,
        roles: ADMIN_ROLES,
      },
      {
        title: "Notifications",
        href: "/dashboard/notifications",
        icon: Bell,
        roles: ALL_INTERNAL,
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: ["SUPER_ADMIN"],
      },
      {
        title: "Org Settings",
        href: "/dashboard/org-settings",
        icon: UserCog,
        roles: ADMIN_ROLES,
      },
      {
        title: "Billing",
        href: "/dashboard/billing",
        icon: CreditCard,
        roles: ["SUPER_ADMIN"],
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
      title: "Organizations",
      href: "/dashboard/platform/organizations",
      icon: Shield,
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
    ? [...navSections, platformSection]
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

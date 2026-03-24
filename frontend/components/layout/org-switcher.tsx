"use client"

import { useAuthStore } from "@/store/auth-store"
import { Building2, ChevronsUpDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function OrgSwitcher() {
  const { activeOrgId, organizations, switchOrg } = useAuthStore()

  if (!organizations || organizations.length <= 1) return null

  const activeOrg = organizations.find((o) => o.org_id === activeOrgId)

  const handleSwitch = async (orgId: string) => {
    if (orgId === activeOrgId) return
    await switchOrg(orgId)
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden md:inline max-w-[120px] truncate">
            {activeOrg?.org_name ?? "Select Org"}
          </span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.org_id}
            onClick={() => handleSwitch(org.org_id)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col">
              <span className="font-medium">{org.org_name}</span>
              <span className="text-xs text-muted-foreground">
                {org.role.replace("_", " ")}
              </span>
            </div>
            {org.org_id === activeOrgId && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

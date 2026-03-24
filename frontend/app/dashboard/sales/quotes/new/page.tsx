"use client"

import { Suspense } from "react"
import RoleGuard from "@/components/auth/role-guard"
import { WizardShell } from "@/components/quotes/wizard/wizard-shell"
import { Loader2 } from "lucide-react"

const ALLOWED_ROLES = ["SUPER_ADMIN", "MANAGER", "SALES"]

export default function NewQuotationPage() {
  return (
    <RoleGuard allowedRoles={ALLOWED_ROLES}>
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <WizardShell />
      </Suspense>
    </RoleGuard>
  )
}

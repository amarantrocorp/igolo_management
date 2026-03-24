"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import {
  Loader2,
  Building2,
  Users,
  Rocket,
  Plus,
  Trash2,
  ArrowRight,
  UserPlus,
  FileText,
  Settings,
} from "lucide-react"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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

const STEPS = [
  { label: "Company Setup", icon: Building2 },
  { label: "Invite Team", icon: Users },
  { label: "You're All Set!", icon: Rocket },
]

const INVITABLE_ROLES = [
  { value: "SALES", label: "Sales" },
  { value: "MANAGER", label: "Manager" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "BDE", label: "BDE" },
]

interface TeamInvite {
  email: string
  role: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)

  // Step 1 state
  const [address, setAddress] = useState("")
  const [gstNumber, setGstNumber] = useState("")

  // Step 2 state
  const [invites, setInvites] = useState<TeamInvite[]>([
    { email: "", role: "SALES" },
  ])

  const companySetupMutation = useMutation({
    mutationFn: async () => {
      // Only send if there's something to update
      if (address || gstNumber) {
        // PATCH the org with optional fields
        await api.patch("/platform/org/settings", {
          address: address || undefined,
          gst_number: gstNumber || undefined,
        })
      }
    },
    onSuccess: () => {
      setCurrentStep(1)
    },
    onError: () => {
      // Still advance even if the optional update fails
      setCurrentStep(1)
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const validInvites = invites.filter(
        (inv) => inv.email.trim() && inv.role
      )
      if (validInvites.length === 0) return

      // Send invites one by one (fire and forget style)
      const results = await Promise.allSettled(
        validInvites.map((inv) =>
          api.post("/users/invite", {
            email: inv.email.trim(),
            role: inv.role,
          })
        )
      )
      return results
    },
    onSuccess: () => {
      setCurrentStep(2)
    },
    onError: () => {
      // Still advance even if invites partially fail
      setCurrentStep(2)
    },
  })

  const addInviteRow = () => {
    if (invites.length < 3) {
      setInvites([...invites, { email: "", role: "SALES" }])
    }
  }

  const removeInviteRow = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index))
  }

  const updateInvite = (
    index: number,
    field: keyof TeamInvite,
    value: string
  ) => {
    const updated = [...invites]
    updated[index] = { ...updated[index], [field]: value }
    setInvites(updated)
  }

  const goToDashboard = () => {
    router.push("/dashboard")
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress Indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = index === currentStep
          const isCompleted = index < currentStep
          return (
            <div key={step.label} className="flex items-center gap-2">
              {index > 0 && (
                <div
                  className={`h-px w-8 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-[10px] ${
                    isActive
                      ? "font-medium text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  Step {index + 1}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Step 1: Company Setup */}
      {currentStep === 0 && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Company Setup</CardTitle>
            <CardDescription>
              Add your company details. You can always update these later in
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Company Address</Label>
              <Textarea
                id="address"
                placeholder="123 Design Street, Creative City"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst">
                GST Number{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="gst"
                placeholder="22AAAAA0000A1Z5"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep(1)}
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={() => companySetupMutation.mutate()}
              disabled={companySetupMutation.isPending}
            >
              {companySetupMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save & Continue
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 2: Invite Team */}
      {currentStep === 1 && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Invite Your Team</CardTitle>
            <CardDescription>
              Add up to 3 team members. They will receive an email invitation to
              join your workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invites.map((invite, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    type="email"
                    placeholder="colleague@company.com"
                    value={invite.email}
                    onChange={(e) =>
                      updateInvite(index, "email", e.target.value)
                    }
                  />
                </div>
                <Select
                  value={invite.role}
                  onValueChange={(value) =>
                    updateInvite(index, "role", value)
                  }
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invites.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeInviteRow(index)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            {invites.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInviteRow}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Another
              </Button>
            )}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep(2)}
            >
              Skip for now
            </Button>
            <Button
              className="flex-1"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending}
            >
              {inviteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invites
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Step 3: All Set */}
      {currentStep === 2 && (
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <Rocket className="h-7 w-7 text-green-600" />
            </div>
            <CardTitle className="text-xl">You&apos;re All Set!</CardTitle>
            <CardDescription>
              Your workspace is ready. Here are some things you can do next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push("/dashboard/sales/leads")}
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Add Your First Lead</p>
                <p className="text-xs text-muted-foreground">
                  Start tracking potential clients in the CRM.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => router.push("/dashboard/sales/quotes")}
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Create a Quotation</p>
                <p className="text-xs text-muted-foreground">
                  Build professional room-by-room quotes.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => router.push("/dashboard/admin/users")}
              className="flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <Settings className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Explore Settings</p>
                <p className="text-xs text-muted-foreground">
                  Configure users, inventory, and company settings.
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={goToDashboard}>
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}

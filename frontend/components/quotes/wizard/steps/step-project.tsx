"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Ruler,
  IndianRupee,
  Layers,
  Star,
  Crown,
  Sparkles,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import {
  PROPERTY_TYPES,
  BUDGET_RANGES,
  PACKAGES,
  CITIES,
} from "@/lib/quote-wizard-constants"
import api from "@/lib/api"
import type { PackageType } from "@/types/quote-wizard"

const PACKAGE_ICONS: Record<string, React.ReactNode> = {
  Layers: <Layers className="h-6 w-6" />,
  Star: <Star className="h-6 w-6" />,
  Crown: <Crown className="h-6 w-6" />,
  Sparkles: <Sparkles className="h-6 w-6" />,
}

export default function StepProject() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("lead_id")

  const { projectDetails, updateProjectDetails } = useQuoteWizardStore()

  // Fetch lead details when lead_id is present in URL
  const { data: leadData } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const res = await api.get(`/crm/leads/${leadId}`)
      return res.data
    },
    enabled: !!leadId,
  })

  // Pre-fill from lead data
  useEffect(() => {
    if (leadData) {
      updateProjectDetails({
        leadId: leadData.id,
        clientName: leadData.name || "",
        clientEmail: leadData.email || "",
        clientPhone: leadData.contact_number || "",
      })
    }
  }, [leadData]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* ── Client Information ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Client Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientName"
                placeholder="Full name"
                className="pl-9"
                value={projectDetails.clientName}
                onChange={(e) =>
                  updateProjectDetails({ clientName: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientEmail"
                type="email"
                placeholder="email@example.com"
                className="pl-9"
                value={projectDetails.clientEmail}
                onChange={(e) =>
                  updateProjectDetails({ clientEmail: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientPhone"
                type="tel"
                placeholder="+91 9876543210"
                className="pl-9"
                value={projectDetails.clientPhone}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^\d+\s\-()]/g, "")
                  updateProjectDetails({ clientPhone: filtered })
                }}
                onKeyDown={(e) => {
                  if (
                    e.key.length === 1 &&
                    !/[\d+\s\-()]/g.test(e.key) &&
                    !e.ctrlKey &&
                    !e.metaKey
                  ) {
                    e.preventDefault()
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Project Details ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Project Details
        </h3>
        <div className="space-y-4">
          {/* Project Name + City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="projectName"
                  placeholder="e.g. Prestige Lakeside Villa"
                  className="pl-9"
                  value={projectDetails.projectName}
                  onChange={(e) =>
                    updateProjectDetails({ projectName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={projectDetails.city}
                onValueChange={(val) => updateProjectDetails({ city: val })}
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select city" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Type chips */}
          <div className="space-y-2">
            <Label>Property Type</Label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((pt) => {
                const isActive = projectDetails.propertyType === pt.value
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() =>
                      updateProjectDetails({ propertyType: pt.value })
                    }
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                      ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-background text-foreground border-border hover:bg-muted"
                      }
                    `}
                  >
                    {pt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Flat Size + Budget Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="flatSize">Flat Size (sqft)</Label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="flatSize"
                  type="number"
                  min={0}
                  placeholder="e.g. 1500"
                  className="pl-9"
                  value={projectDetails.flatSizeSqft}
                  onChange={(e) =>
                    updateProjectDetails({ flatSizeSqft: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Budget Range</Label>
              <Select
                value={projectDetails.budgetRange}
                onValueChange={(val) =>
                  updateProjectDetails({
                    budgetRange: val as (typeof BUDGET_RANGES)[number],
                  })
                }
              >
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select budget" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* ── Package Type ── */}
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Package Type
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PACKAGES.map((pkg) => {
            const isActive = projectDetails.packageType === pkg.key
            return (
              <button
                key={pkg.key}
                type="button"
                onClick={() =>
                  updateProjectDetails({ packageType: pkg.key as PackageType })
                }
                className={`
                  relative flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-center transition-all
                  ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "border-border bg-background text-foreground hover:border-blue-300 hover:bg-blue-50/50"
                  }
                `}
              >
                <div
                  className={`
                    rounded-lg p-2
                    ${isActive ? "bg-white/20" : "bg-muted"}
                  `}
                >
                  <span className={isActive ? "text-white" : "text-muted-foreground"}>
                    {PACKAGE_ICONS[pkg.icon]}
                  </span>
                </div>
                <span className="text-sm font-semibold">{pkg.label}</span>
                <span
                  className={`text-xs ${isActive ? "text-blue-100" : "text-muted-foreground"}`}
                >
                  {pkg.description}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

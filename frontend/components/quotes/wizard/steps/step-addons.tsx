"use client"

import {
  HardHat,
  Armchair,
  Wrench,
  Gem,
} from "lucide-react"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { ADDON_CATEGORIES } from "@/lib/quote-wizard-constants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Map category icon strings to components
const ICON_MAP: Record<string, React.ElementType> = {
  HardHat,
  Armchair,
  Wrench,
  Gem,
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function StepAddons() {
  const { selectedAddons, toggleAddon } = useQuoteWizardStore()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Add-ons & Services
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select optional services and premium add-ons to include in your
          quotation.
        </p>
      </div>

      {/* Category sections */}
      {ADDON_CATEGORIES.map((category) => {
        const Icon = ICON_MAP[category.icon] ?? Wrench

        return (
          <div key={category.key} className="space-y-3">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{category.label}</h3>
            </div>

            {/* Grid of checkbox cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {category.items.map((addon) => {
                const isSelected = selectedAddons.includes(addon.key)

                return (
                  <Card
                    key={addon.key}
                    className={`cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary ring-1 ring-primary"
                        : "hover:border-primary/40"
                    }`}
                    onClick={() => toggleAddon(addon.key)}
                  >
                    <CardContent className="flex items-start gap-3 p-4">
                      {/* Checkbox */}
                      <div className="pt-0.5">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="h-3 w-3 text-primary-foreground"
                              viewBox="0 0 12 12"
                              fill="none"
                            >
                              <path
                                d="M2 6l3 3 5-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Label and price */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isSelected
                              ? "text-foreground"
                              : "text-foreground/80"
                          }`}
                        >
                          {addon.label}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Base: {formatINR(addon.basePrice)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

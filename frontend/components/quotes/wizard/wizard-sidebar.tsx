"use client"

import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { MATERIAL_CATEGORIES, PACKAGES } from "@/lib/quote-wizard-constants"
import { LayoutList } from "lucide-react"

function formatINR(n: number): string {
  if (n === 0) return "\u20B90"
  return "\u20B9" + n.toLocaleString("en-IN")
}

export function WizardSidebar() {
  const {
    projectDetails,
    rooms,
    materials,
    costBreakdown,
  } = useQuoteWizardStore()

  const pkg = PACKAGES.find((p) => p.key === projectDetails.packageType)

  const woodLabel = MATERIAL_CATEGORIES
    .find((c) => c.key === "wood")
    ?.options.find((o) => o.key === materials.global.wood)?.label ?? ""
  const finishLabel = MATERIAL_CATEGORIES
    .find((c) => c.key === "finish")
    ?.options.find((o) => o.key === materials.global.finish)?.label ?? ""
  const hwLabel = MATERIAL_CATEGORIES
    .find((c) => c.key === "hardware")
    ?.options.find((o) => o.key === materials.global.hardware)?.label ?? ""
  const ctLabel = MATERIAL_CATEGORIES
    .find((c) => c.key === "countertop")
    ?.options.find((o) => o.key === materials.global.countertop)?.label ?? ""

  const totalItems = rooms.reduce((sum, r) => sum + r.selectedItemKeys.length, 0)

  return (
    <div className="w-[280px] flex-shrink-0 border-l bg-white">
      <div className="sticky top-0 p-4 space-y-5 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <LayoutList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Live Cost Summary</h3>
        </div>

        {/* Project */}
        <div>
          <p className="text-[10px] font-bold text-primary tracking-wider mb-1">PROJECT</p>
          <p className="text-sm font-medium">{projectDetails.projectName || "Untitled"}</p>
          {projectDetails.propertyType && (
            <p className="text-xs text-muted-foreground">
              {projectDetails.propertyType} {projectDetails.flatSizeSqft ? `\u2022 ${projectDetails.flatSizeSqft} sqft` : ""}
            </p>
          )}
          {(pkg || projectDetails.city) && (
            <p className="text-xs text-muted-foreground">
              {pkg ? `${pkg.label} Package` : ""}{pkg && projectDetails.city ? " \u2022 " : ""}{projectDetails.city}
            </p>
          )}
        </div>

        {/* Scope */}
        <div>
          <p className="text-[10px] font-bold text-primary tracking-wider mb-1">
            SCOPE ({rooms.length} ROOMS \u2022 {totalItems} ITEMS)
          </p>
          {rooms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rooms selected</p>
          ) : (
            <div className="space-y-0.5">
              {rooms.map((r) => (
                <div key={r.key} className="flex items-center justify-between">
                  <span className="text-xs">{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.selectedItemKeys.length} items
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials */}
        {(woodLabel || finishLabel) && (
          <div>
            <p className="text-[10px] font-bold text-primary tracking-wider mb-1">MATERIALS</p>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              {woodLabel && finishLabel && <p>{woodLabel} \u2022 {finishLabel}</p>}
              {hwLabel && <p>{hwLabel}</p>}
              {rooms.some((r) => r.key === "KITCHEN") && ctLabel && (
                <p>Countertop: {ctLabel}</p>
              )}
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        <div>
          <p className="text-[10px] font-bold text-primary tracking-wider mb-2">COST BREAKDOWN</p>
          <div className="space-y-1.5">
            <Row label="Base Cost" value={costBreakdown.baseCost} />
            <Row label="Material Upgrade" value={costBreakdown.materialUpgrade} />
            <Row label="Hardware Upgrade" value={costBreakdown.hardwareUpgrade} />
            <Row label="Add-ons" value={costBreakdown.addonsCost} />

            <div className="border-t pt-1.5 mt-1.5">
              <Row label="Subtotal" value={costBreakdown.subtotal} bold />
              {costBreakdown.discountAmount > 0 && (
                <Row label="Discount" value={-costBreakdown.discountAmount} />
              )}
              <Row label="GST (18%)" value={costBreakdown.gst} />
            </div>

            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">Final Amount</span>
                <span className="text-sm font-bold text-primary">
                  {formatINR(costBreakdown.finalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${bold ? "font-medium" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`text-xs tabular-nums ${bold ? "font-medium" : ""}`}>
        {formatINR(value)}
      </span>
    </div>
  )
}

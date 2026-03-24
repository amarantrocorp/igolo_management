"use client"

import {
  Layers,
  Settings2,
  Plus,
  Percent,
} from "lucide-react"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import {
  ROOM_DEFINITIONS,
  PACKAGES,
  MATERIAL_CATEGORIES,
} from "@/lib/quote-wizard-constants"
import { calcQuantity, calcItemBasePrice } from "@/lib/quote-wizard-calc"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getMaterialLabel(categoryKey: string, selectedKey: string): string {
  const cat = MATERIAL_CATEGORIES.find((c) => c.key === categoryKey)
  const opt = cat?.options.find((o) => o.key === selectedKey)
  return opt?.label ?? selectedKey
}

export function StepPricing() {
  const {
    rooms,
    materials,
    projectDetails,
    costBreakdown,
    discount,
    setDiscount,
  } = useQuoteWizardStore()

  const pkg = PACKAGES.find((p) => p.key === projectDetails.packageType)
  const pkgMult = pkg?.priceMultiplier ?? 1

  // Build line items for table
  type LineItem = {
    room: string
    item: string
    specification: string
    rate: number
    amount: number
  }

  const lineItems: LineItem[] = []

  for (const room of rooms) {
    const roomDef = ROOM_DEFINITIONS.find((r) => r.key === room.key)
    if (!roomDef) continue

    const roomMats = materials.applyToAll
      ? materials.global
      : (materials.perRoom[room.key] ?? materials.global)

    for (const itemKey of room.selectedItemKeys) {
      const itemDef = roomDef.items.find((i) => i.key === itemKey)
      if (!itemDef) continue

      const qty = calcQuantity(itemDef.quantityFormula, room.dimensions)
      if (qty <= 0) continue

      const basePrice = calcItemBasePrice(itemDef, room.dimensions, pkgMult)

      const specs: string[] = []
      specs.push(`${qty} ${itemDef.unit}`)
      specs.push(getMaterialLabel("wood", roomMats.wood))
      specs.push(getMaterialLabel("finish", roomMats.finish))

      lineItems.push({
        room: room.label,
        item: itemDef.label,
        specification: specs.join(" | "),
        rate: itemDef.baseRatePerUnit,
        amount: basePrice,
      })
    }
  }

  const baseSubtotal = lineItems.reduce((sum, li) => sum + li.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Auto Pricing Review
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the auto-calculated pricing breakdown for all selected rooms
          and items.
        </p>
      </div>

      {/* Room-wise breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Room-wise Detailed Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">ROOM</TableHead>
                  <TableHead className="w-[160px]">ITEM</TableHead>
                  <TableHead>SPECIFICATION</TableHead>
                  <TableHead className="text-right w-[100px]">RATE</TableHead>
                  <TableHead className="text-right w-[120px]">
                    AMOUNT
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      No items selected. Go back to select rooms and items.
                    </TableCell>
                  </TableRow>
                ) : (
                  lineItems.map((li, idx) => (
                    <TableRow key={`${li.room}-${li.item}-${idx}`}>
                      <TableCell className="text-sm font-medium">
                        {li.room}
                      </TableCell>
                      <TableCell className="text-sm">{li.item}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {li.specification}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatINR(li.rate)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatINR(li.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {lineItems.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-right text-sm font-semibold"
                    >
                      Sub-total (Base)
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold">
                      {formatINR(baseSubtotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Material Upgrade
              </span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {formatINR(costBreakdown.materialUpgrade)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Additional cost from selected wood & finish upgrades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Settings2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Hardware Upgrade
              </span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {formatINR(costBreakdown.hardwareUpgrade)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Premium hardware package cost difference
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Add-ons Cost
              </span>
            </div>
            <p className="mt-2 text-xl font-bold">
              {formatINR(costBreakdown.addonsCost)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Selected additional services & premium add-ons
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Adjustments & Discounts */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Adjustments & Discounts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 max-w-xs space-y-1.5">
              <Label htmlFor="discount-percent" className="text-sm">
                Flat Discount (%)
              </Label>
              <Input
                id="discount-percent"
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="0"
                value={discount.flatPercent}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^\d.]/g, "")
                  const num = parseFloat(val)
                  if (!isNaN(num) && num > 100) val = "100"
                  if (!isNaN(num) && num < 0) val = "0"
                  setDiscount(val)
                }}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <span className="text-sm text-muted-foreground">
                Discount Amount:
              </span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {costBreakdown.discountAmount > 0 ? "- " : ""}
                {formatINR(costBreakdown.discountAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

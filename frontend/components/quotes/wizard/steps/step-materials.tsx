"use client"

import { useState } from "react"
import {
  TreePine,
  Paintbrush,
  Settings2,
  CircleDot,
  Info,
} from "lucide-react"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { MATERIAL_CATEGORIES } from "@/lib/quote-wizard-constants"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Map category keys to icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  wood: TreePine,
  finish: Paintbrush,
  hardware: Settings2,
  countertop: CircleDot,
}

// Which categories show a "Price Impact" badge
const PRICE_IMPACT_CATEGORIES = new Set(["finish", "countertop"])

function formatMultiplier(m: number): string {
  if (m === 1) return "Base"
  const pct = Math.round((m - 1) * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}

// ── Shared category selector used in both apply-to-all and per-room modes ──

interface MaterialCategorySelectorProps {
  categoryKey: string
  selectedValue: string
  onSelect: (value: string) => void
  showCountertop: boolean
}

function MaterialCategorySelector({
  categoryKey,
  selectedValue,
  onSelect,
  showCountertop,
}: MaterialCategorySelectorProps) {
  const category = MATERIAL_CATEGORIES.find((c) => c.key === categoryKey)
  if (!category) return null
  if (categoryKey === "countertop" && !showCountertop) return null

  const Icon = CATEGORY_ICONS[categoryKey] ?? CircleDot

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              {category.label}
            </CardTitle>
          </div>
          {PRICE_IMPACT_CATEGORIES.has(categoryKey) && (
            <Badge variant="secondary" className="text-xs">
              Price Impact
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {category.options.map((opt) => {
            const isSelected = selectedValue === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onSelect(opt.key)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                <span
                  className={`ml-1.5 text-xs ${
                    isSelected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground/70"
                  }`}
                >
                  ({formatMultiplier(opt.priceMultiplier)})
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground">{category.description}</p>
      </CardContent>
    </Card>
  )
}

// ── Main Component ──

export function StepMaterials() {
  const {
    rooms,
    materials,
    setApplyToAll,
    updateGlobalMaterial,
    updateRoomMaterial,
  } = useQuoteWizardStore()

  const hasKitchen = rooms.some((r) => r.key === "KITCHEN")
  const [activeRoomTab, setActiveRoomTab] = useState(rooms[0]?.key ?? "")

  const categoryKeys = MATERIAL_CATEGORIES.map((c) => c.key)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Material & Finish Selection
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose materials for your project. Costs will recalculate
          automatically based on your selection.
        </p>
      </div>

      {/* Apply-to-all toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={materials.applyToAll ? "default" : "outline"}
          size="sm"
          onClick={() => setApplyToAll(true)}
        >
          Apply to All Rooms
        </Button>
        <Button
          type="button"
          variant={!materials.applyToAll ? "default" : "outline"}
          size="sm"
          onClick={() => setApplyToAll(false)}
        >
          Customize per Room
        </Button>
      </div>

      {/* ── Apply to all mode ── */}
      {materials.applyToAll && (
        <div className="space-y-4">
          {categoryKeys.map((catKey) => (
            <MaterialCategorySelector
              key={catKey}
              categoryKey={catKey}
              selectedValue={
                materials.global[catKey as keyof typeof materials.global]
              }
              onSelect={(value) =>
                updateGlobalMaterial({ [catKey]: value })
              }
              showCountertop={hasKitchen}
            />
          ))}
        </div>
      )}

      {/* ── Per-room mode ── */}
      {!materials.applyToAll && rooms.length > 0 && (
        <Tabs
          value={activeRoomTab}
          onValueChange={setActiveRoomTab}
          className="w-full"
        >
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {rooms.map((room) => (
              <TabsTrigger
                key={room.key}
                value={room.key}
                className="text-xs px-3 py-1.5"
              >
                {room.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {rooms.map((room) => {
            const roomMats =
              materials.perRoom[room.key] ?? materials.global
            const roomHasKitchen = room.key === "KITCHEN"

            return (
              <TabsContent key={room.key} value={room.key} className="mt-4">
                <div className="space-y-4">
                  {categoryKeys.map((catKey) => (
                    <MaterialCategorySelector
                      key={catKey}
                      categoryKey={catKey}
                      selectedValue={
                        roomMats[catKey as keyof typeof roomMats]
                      }
                      onSelect={(value) =>
                        updateRoomMaterial(room.key, { [catKey]: value })
                      }
                      showCountertop={roomHasKitchen}
                    />
                  ))}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}

      {/* Pricing impact info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Pricing Impact
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <li>
                Acrylic finish adds ~20% over base Laminate cost
              </li>
              <li>
                PU finish adds ~25% over base Laminate cost
              </li>
              <li>
                Veneer finish adds ~35% over base Laminate cost
              </li>
              <li>
                Blum hardware adds ~15% over standard hardware
              </li>
              <li>
                Quartz countertop adds ~40% over Granite
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

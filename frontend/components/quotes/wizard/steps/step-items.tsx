"use client"

import { useState, useMemo, useCallback } from "react"
import {
  ChevronUp,
  ChevronDown,
  Check,
  Sparkles,
  Settings,
  Crown,
  Wrench,
  Sofa,
  UtensilsCrossed,
  ChefHat,
  BedDouble,
  BedSingle,
  Star,
  Flame,
  DoorOpen,
  Home,
  BookOpen,
  Monitor,
  Wine,
  Footprints,
  LayoutGrid,
} from "lucide-react"
import RoomBuilderModal from "../room-builder-modal"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { ROOM_DEFINITIONS, PACKAGES } from "@/lib/quote-wizard-constants"
import { calcQuantity, calcItemBasePrice } from "@/lib/quote-wizard-calc"
import type { LucideIcon } from "lucide-react"
import type {
  ItemTier,
  RoomItemDefinition,
  RoomDefinition,
  WizardSelectedRoom,
} from "@/types/quote-wizard"

// ── Icon mapping ──

const ICON_MAP: Record<string, LucideIcon> = {
  Sofa,
  UtensilsCrossed,
  ChefHat,
  Wrench,
  BedDouble,
  BedSingle,
  Star,
  Flame,
  DoorOpen,
  Home,
  BookOpen,
  Monitor,
  Wine,
  Footprints,
}

function RoomIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICON_MAP[name]
  if (!Icon) return <Home className={className} />
  return <Icon className={className} />
}

const TIER_CONFIG: Record<
  ItemTier,
  { label: string; icon: React.ReactNode; color: string }
> = {
  RECOMMENDED: {
    label: "RECOMMENDED ITEMS",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "text-green-600",
  },
  OPTIONAL: {
    label: "OPTIONAL ITEMS",
    icon: <Settings className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
  },
  PREMIUM: {
    label: "PREMIUM ITEMS",
    icon: <Crown className="h-3.5 w-3.5" />,
    color: "text-amber-600",
  },
}

const TIER_ORDER: ItemTier[] = ["RECOMMENDED", "OPTIONAL", "PREMIUM"]

function formatCurrency(amount: number): string {
  if (amount <= 0) return "--"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

// ── Room Accordion Item (extracted to respect hooks rules) ──

function RoomAccordion({
  room,
  roomDef,
  isExpanded,
  onToggleExpand,
  pkgMult,
  hasBuilderConfig,
  onOpenBuilder,
}: {
  room: WizardSelectedRoom
  roomDef: RoomDefinition | undefined
  isExpanded: boolean
  onToggleExpand: () => void
  pkgMult: number
  hasBuilderConfig: boolean
  onOpenBuilder: () => void
}) {
  const { toggleItem } = useQuoteWizardStore()

  const totalItems = roomDef?.items.length ?? 0
  const selectedCount = room.selectedItemKeys.length

  const itemsByTier = useMemo(() => {
    if (!roomDef) return new Map<ItemTier, RoomItemDefinition[]>()
    const grouped = new Map<ItemTier, RoomItemDefinition[]>()
    for (const tier of TIER_ORDER) {
      const items = roomDef.items.filter((i) => i.tier === tier)
      if (items.length > 0) grouped.set(tier, items)
    }
    return grouped
  }, [roomDef])

  return (
    <div className="rounded-xl border bg-background overflow-hidden">
      {/* Room Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="rounded-lg p-1.5 bg-muted text-muted-foreground">
          <RoomIcon name={roomDef?.icon ?? "Home"} className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold flex-1 text-left">
          {room.label}
        </span>
        <span className="text-xs text-muted-foreground mr-2">
          {selectedCount}/{totalItems} items selected
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenBuilder()
          }}
          className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors mr-2 hidden sm:inline-flex"
        >
          <LayoutGrid className="h-3 w-3" />
          Room Builder
          {hasBuilderConfig && (
            <span className="h-2 w-2 rounded-full bg-green-500 ml-1" />
          )}
        </button>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && roomDef && (
        <div className="border-t px-4 py-3 space-y-4">
          {Array.from(itemsByTier.entries()).map(([tier, items]) => {
            const tierConf = TIER_CONFIG[tier]
            return (
              <div key={tier} className="space-y-1">
                {/* Tier heading */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={tierConf.color}>{tierConf.icon}</span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${tierConf.color}`}
                  >
                    {tierConf.label}
                  </span>
                </div>

                {/* Item rows */}
                {items.map((itemDef) => {
                  const isChecked = room.selectedItemKeys.includes(
                    itemDef.key
                  )
                  const price = calcItemBasePrice(
                    itemDef,
                    room.dimensions,
                    pkgMult
                  )

                  return (
                    <button
                      key={itemDef.key}
                      type="button"
                      onClick={() => toggleItem(room.key, itemDef.key)}
                      className={`
                        flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors
                        ${isChecked ? "bg-blue-50/60" : "hover:bg-muted/50"}
                      `}
                    >
                      {/* Checkbox */}
                      <div
                        className={`
                          flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors
                          ${
                            isChecked
                              ? "border-blue-600 bg-blue-600"
                              : "border-muted-foreground/30 bg-background"
                          }
                        `}
                      >
                        {isChecked && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>

                      {/* Label + rate */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {itemDef.label}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatCurrency(itemDef.baseRatePerUnit)}/
                          {itemDef.unit}
                        </span>
                      </div>

                      {/* Calculated price */}
                      {isChecked && price > 0 && (
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                          {formatCurrency(price)}
                        </span>
                      )}

                      {/* Wrench icon */}
                      <Wrench className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    </button>
                  )
                })}
              </div>
            )
          })}

          {/* Custom room with no item definitions */}
          {room.isCustom && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Custom room -- items will be added manually in the quote editor.
            </p>
          )}
        </div>
      )}

      {/* Custom room collapsed fallback */}
      {isExpanded && !roomDef && room.isCustom && (
        <div className="border-t px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Custom room -- items will be added manually in the quote editor.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Step Component ──

export default function StepItems() {
  const { rooms, projectDetails, roomBuilderData, updateRoomBuilder } =
    useQuoteWizardStore()

  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (rooms.length > 0) initial.add(rooms[0].key)
    return initial
  })

  const [builderRoom, setBuilderRoom] = useState<string | null>(null)
  const activeBuilderRoom = rooms.find((r) => r.key === builderRoom)

  const pkgMult = useMemo(() => {
    const pkg = PACKAGES.find((p) => p.key === projectDetails.packageType)
    return pkg?.priceMultiplier ?? 1
  }, [projectDetails.packageType])

  function toggleExpand(key: string) {
    setExpandedRooms((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-lg font-semibold">Room Item Selection</h2>
        <p className="text-sm text-muted-foreground">
          Select items for each room. Quantities are auto-calculated from
          dimensions.
        </p>
      </div>

      {/* ── Room Accordions ── */}
      <div className="space-y-3">
        {rooms.map((room) => {
          const roomDef = ROOM_DEFINITIONS.find((r) => r.key === room.key)
          return (
            <RoomAccordion
              key={room.key}
              room={room}
              roomDef={roomDef}
              isExpanded={expandedRooms.has(room.key)}
              onToggleExpand={() => toggleExpand(room.key)}
              pkgMult={pkgMult}
              hasBuilderConfig={!!roomBuilderData[room.key]}
              onOpenBuilder={() => setBuilderRoom(room.key)}
            />
          )
        })}

        {rooms.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No rooms selected. Go back to Step 2 to add rooms first.
            </p>
          </div>
        )}
      </div>

      {/* Room Builder Modal */}
      {activeBuilderRoom && (
        <RoomBuilderModal
          open={!!builderRoom}
          onClose={() => setBuilderRoom(null)}
          room={activeBuilderRoom}
          initialConfig={roomBuilderData[activeBuilderRoom.key]}
          onSave={(config) => updateRoomBuilder(activeBuilderRoom.key, config)}
        />
      )}
    </div>
  )
}

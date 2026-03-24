"use client"

import { useState } from "react"
import {
  Check,
  Plus,
  Info,
  RotateCcw,
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
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { ROOM_DEFINITIONS } from "@/lib/quote-wizard-constants"
import type { LucideIcon } from "lucide-react"

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

export default function StepRooms() {
  const {
    rooms,
    projectDetails,
    toggleRoom,
    selectStandardRooms,
    resetRooms,
    updateRoomDimensions,
    addCustomRoom,
  } = useQuoteWizardStore()

  const [customRoomName, setCustomRoomName] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)

  const selectedKeys = new Set(rooms.map((r) => r.key))
  const selectedCount = rooms.length

  function handleAddCustomRoom() {
    const name = customRoomName.trim()
    if (!name) return
    addCustomRoom(name)
    setCustomRoomName("")
    setShowCustomInput(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Select Rooms</h2>
          <p className="text-sm text-muted-foreground">
            Choose rooms to include.{" "}
            <span className="font-medium text-foreground">
              {selectedCount} selected.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetRooms}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={selectStandardRooms}
            disabled={!projectDetails.propertyType}
            className="gap-1.5"
          >
            Select Standard Rooms
          </Button>
        </div>
      </div>

      {/* ── Room Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROOM_DEFINITIONS.map((roomDef) => {
          const isSelected = selectedKeys.has(roomDef.key)
          const selectedRoom = rooms.find((r) => r.key === roomDef.key)

          return (
            <div
              key={roomDef.key}
              role="button"
              tabIndex={0}
              onClick={() => toggleRoom(roomDef.key, roomDef.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleRoom(roomDef.key, roomDef.label)
                }
              }}
              className={`
                relative flex flex-col items-center rounded-xl border-2 p-4 cursor-pointer transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-border bg-background hover:border-muted-foreground/30"
                }
              `}
            >
              {/* Checkmark badge */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div
                className={`
                  rounded-lg p-2 mb-2
                  ${isSelected ? "bg-blue-100 text-blue-600" : "bg-muted text-muted-foreground"}
                `}
              >
                <RoomIcon name={roomDef.icon} className="h-5 w-5" />
              </div>

              {/* Name */}
              <span
                className={`text-sm font-medium text-center ${
                  isSelected ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {roomDef.label}
              </span>

              {/* Dimensions inputs (shown only when selected) */}
              {isSelected && selectedRoom && (
                <div
                  className="mt-3 w-full space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                    Enter L x B x H
                  </span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      placeholder="L"
                      className="h-7 text-xs px-1.5 text-center"
                      value={selectedRoom.dimensions.length === "0" ? "" : selectedRoom.dimensions.length}
                      onChange={(e) =>
                        updateRoomDimensions(roomDef.key, {
                          length: e.target.value || "0",
                        })
                      }
                    />
                    <span className="text-muted-foreground text-xs shrink-0">x</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="B"
                      className="h-7 text-xs px-1.5 text-center"
                      value={selectedRoom.dimensions.breadth === "0" ? "" : selectedRoom.dimensions.breadth}
                      onChange={(e) =>
                        updateRoomDimensions(roomDef.key, {
                          breadth: e.target.value || "0",
                        })
                      }
                    />
                    <span className="text-muted-foreground text-xs shrink-0">x</span>
                    <Input
                      type="number"
                      min={0}
                      placeholder="H"
                      className="h-7 text-xs px-1.5 text-center"
                      value={selectedRoom.dimensions.height === "0" ? "" : selectedRoom.dimensions.height}
                      onChange={(e) =>
                        updateRoomDimensions(roomDef.key, {
                          height: e.target.value || "0",
                        })
                      }
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    in feet
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {/* Custom room cards that are already added */}
        {rooms
          .filter((r) => r.isCustom)
          .map((room) => (
            <div
              key={room.key}
              role="button"
              tabIndex={0}
              onClick={() => toggleRoom(room.key, room.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  toggleRoom(room.key, room.label)
                }
              }}
              className="relative flex flex-col items-center rounded-xl border-2 border-blue-500 bg-blue-50/50 p-4 cursor-pointer transition-all"
            >
              <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                <Check className="h-3 w-3 text-white" />
              </div>
              <div className="rounded-lg p-2 mb-2 bg-blue-100 text-blue-600">
                <Home className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-center text-foreground">
                {room.label}
              </span>

              {/* Dimensions */}
              <div
                className="mt-3 w-full space-y-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
                  Enter L x B x H
                </span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    placeholder="L"
                    className="h-7 text-xs px-1.5 text-center"
                    value={room.dimensions.length === "0" ? "" : room.dimensions.length}
                    onChange={(e) =>
                      updateRoomDimensions(room.key, {
                        length: e.target.value || "0",
                      })
                    }
                  />
                  <span className="text-muted-foreground text-xs shrink-0">x</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="B"
                    className="h-7 text-xs px-1.5 text-center"
                    value={room.dimensions.breadth === "0" ? "" : room.dimensions.breadth}
                    onChange={(e) =>
                      updateRoomDimensions(room.key, {
                        breadth: e.target.value || "0",
                      })
                    }
                  />
                  <span className="text-muted-foreground text-xs shrink-0">x</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="H"
                    className="h-7 text-xs px-1.5 text-center"
                    value={room.dimensions.height === "0" ? "" : room.dimensions.height}
                    onChange={(e) =>
                      updateRoomDimensions(room.key, {
                        height: e.target.value || "0",
                      })
                    }
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  in feet
                </p>
              </div>
            </div>
          ))}

        {/* ── Add Custom Room Card ── */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            if (!showCustomInput) setShowCustomInput(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              if (!showCustomInput) setShowCustomInput(true)
            }
          }}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 p-4 cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50/30 min-h-[120px]"
        >
          {showCustomInput ? (
            <div
              className="w-full space-y-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                autoFocus
                placeholder="Room name"
                className="h-8 text-sm"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddCustomRoom()
                  if (e.key === "Escape") {
                    setShowCustomInput(false)
                    setCustomRoomName("")
                  }
                }}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleAddCustomRoom}
                  disabled={!customRoomName.trim()}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowCustomInput(false)
                    setCustomRoomName("")
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-lg p-2 mb-2 bg-muted text-muted-foreground">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Add Room
              </span>
              <span className="text-[10px] text-muted-foreground text-center mt-0.5">
                Missing a room? Add it here
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Room dimensions (L x B x H) are used to auto-calculate quantities for
          items like false ceilings, wardrobes, and wall panels. Enter
          approximate values in feet for best results.
        </p>
      </div>
    </div>
  )
}

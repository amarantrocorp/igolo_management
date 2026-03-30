import type {
  QuantityFormula,
  WizardRoomDimensions,
  WizardState,
  WizardCostBreakdown,
  WizardSelectedRoom,
  WizardMaterialSelection,
  RoomItemDefinition,
} from "@/types/quote-wizard"
import {
  ROOM_DEFINITIONS,
  PACKAGES,
  MATERIAL_CATEGORIES,
  ADDON_CATEGORIES,
  GST_RATE,
} from "./quote-wizard-constants"

// ── Dimension Helpers ──

function parseDim(val: string): number {
  const n = parseFloat(val)
  return isNaN(n) || n <= 0 ? 0 : n
}

export function calcQuantity(
  formula: QuantityFormula,
  dims: WizardRoomDimensions
): number {
  const L = parseDim(dims.length)
  const B = parseDim(dims.breadth)
  const H = parseDim(dims.height)

  switch (formula.type) {
    case "fixed":
      return formula.value
    case "length":
      return L
    case "width":
      return B
    case "floor_area":
      return L * B
    case "wall_area":
      return 2 * (L + B) * H
    case "perimeter":
      return 2 * (L + B)
    case "wall_length":
      return L * formula.wallCount
    default:
      return 0
  }
}

// ── Item Price ──

function getMaterialMultiplier(
  categoryKey: string,
  selectedKey: string
): number {
  const cat = MATERIAL_CATEGORIES.find((c) => c.key === categoryKey)
  if (!cat) return 1
  const opt = cat.options.find((o) => o.key === selectedKey)
  return opt?.priceMultiplier ?? 1
}

export function calcItemPrice(
  itemDef: RoomItemDefinition,
  dims: WizardRoomDimensions,
  packageMultiplier: number,
  materials: WizardMaterialSelection
): number {
  const qty = calcQuantity(itemDef.quantityFormula, dims)
  if (qty <= 0) return 0

  const basePrice = itemDef.baseRatePerUnit * qty * packageMultiplier

  // Apply material multipliers for carpentry items (unit = rft, sqft, unit)
  const woodMult = getMaterialMultiplier("wood", materials.wood)
  const finishMult = getMaterialMultiplier("finish", materials.finish)

  return Math.round(basePrice * woodMult * finishMult)
}

export function calcItemBasePrice(
  itemDef: RoomItemDefinition,
  dims: WizardRoomDimensions,
  packageMultiplier: number
): number {
  const qty = calcQuantity(itemDef.quantityFormula, dims)
  if (qty <= 0) return 0
  return Math.round(itemDef.baseRatePerUnit * qty * packageMultiplier)
}

// ── Find Item Definition ──

export function findItemDef(
  roomKey: string,
  itemKey: string
): RoomItemDefinition | undefined {
  const roomDef = ROOM_DEFINITIONS.find((r) => r.key === roomKey)
  return roomDef?.items.find((i) => i.key === itemKey)
}

// ── Full Cost Breakdown ──

export function calcCostBreakdown(state: WizardState): WizardCostBreakdown {
  const pkg = PACKAGES.find((p) => p.key === state.projectDetails.packageType)
  const pkgMult = pkg?.priceMultiplier ?? 1

  // Base material multipliers (for the "base" = no upgrade scenario)
  const baseWoodMult = getMaterialMultiplier("wood", "BWP_PLY")
  const baseFinishMult = getMaterialMultiplier("finish", "LAMINATE")
  const baseHwMult = getMaterialMultiplier("hardware", "HETTICH_STD")

  let baseCost = 0
  let materialUpgrade = 0
  let hardwareUpgrade = 0

  for (const room of state.rooms) {
    const roomDef = ROOM_DEFINITIONS.find((r) => r.key === room.key)
    if (!roomDef) continue

    const mats = state.materials.applyToAll
      ? state.materials.global
      : (state.materials.perRoom[room.key] ?? state.materials.global)

    const woodMult = getMaterialMultiplier("wood", mats.wood)
    const finishMult = getMaterialMultiplier("finish", mats.finish)
    const hwMult = getMaterialMultiplier("hardware", mats.hardware)

    for (const itemKey of room.selectedItemKeys) {
      const itemDef = roomDef.items.find((i) => i.key === itemKey)
      if (!itemDef) continue

      const qty = calcQuantity(itemDef.quantityFormula, room.dimensions)
      if (qty <= 0) continue

      const rawBase = itemDef.baseRatePerUnit * qty * pkgMult

      // Base cost uses standard material rates
      const itemBase = Math.round(rawBase * baseWoodMult * baseFinishMult)
      baseCost += itemBase

      // Material upgrade = difference from selected materials vs base
      const itemWithMats = Math.round(rawBase * woodMult * finishMult)
      materialUpgrade += itemWithMats - itemBase

      // Hardware upgrade = percentage uplift on base
      const hwDelta = Math.round(itemBase * (hwMult - baseHwMult))
      hardwareUpgrade += hwDelta
    }
  }

  // Add-ons
  let addonsCost = 0
  for (const cat of ADDON_CATEGORIES) {
    for (const addon of cat.items) {
      if (state.selectedAddons.includes(addon.key)) {
        addonsCost += addon.basePrice
      }
    }
  }

  const subtotal = baseCost + materialUpgrade + hardwareUpgrade + addonsCost

  const discountPercent = parseFloat(state.discount.flatPercent) || 0
  const discountAmount = Math.round(subtotal * (discountPercent / 100))

  const afterDiscount = subtotal - discountAmount
  const gst = Math.round(afterDiscount * GST_RATE)
  const finalAmount = afterDiscount + gst

  return {
    baseCost,
    materialUpgrade,
    hardwareUpgrade,
    addonsCost,
    subtotal,
    discountAmount,
    gst,
    finalAmount,
  }
}

// ── Build API Payload ──

export function buildQuotePayload(state: WizardState) {
  const pkg = PACKAGES.find((p) => p.key === state.projectDetails.packageType)
  const pkgMult = pkg?.priceMultiplier ?? 1

  const mats = state.materials.global
  const woodMult = getMaterialMultiplier("wood", mats.wood)
  const finishMult = getMaterialMultiplier("finish", mats.finish)
  const hwMult = getMaterialMultiplier("hardware", mats.hardware)

  const rooms = state.rooms.map((room) => {
    const roomDef = ROOM_DEFINITIONS.find((r) => r.key === room.key)
    const roomMats = state.materials.applyToAll
      ? state.materials.global
      : (state.materials.perRoom[room.key] ?? state.materials.global)

    const rWoodMult = getMaterialMultiplier("wood", roomMats.wood)
    const rFinishMult = getMaterialMultiplier("finish", roomMats.finish)

    const L = parseDim(room.dimensions.length)
    const B = parseDim(room.dimensions.breadth)

    const items = room.selectedItemKeys
      .map((itemKey) => {
        const itemDef = roomDef?.items.find((i) => i.key === itemKey)
        if (!itemDef) return null
        const qty = calcQuantity(itemDef.quantityFormula, room.dimensions)
        if (qty <= 0) return null

        const unitPrice = Math.round(
          itemDef.baseRatePerUnit * pkgMult * rWoodMult * rFinishMult
        )

        return {
          description: itemDef.label,
          quantity: qty,
          unit: itemDef.unit,
          unit_price: unitPrice,
          markup_percentage: 0,
        }
      })
      .filter(Boolean)

    return {
      name: room.label,
      area_sqft: L * B > 0 ? L * B : undefined,
      items,
    }
  })

  // Add add-ons as a separate room
  const addonItems: Array<{
    description: string
    quantity: number
    unit: string
    unit_price: number
    markup_percentage: number
  }> = []

  for (const cat of ADDON_CATEGORIES) {
    for (const addon of cat.items) {
      if (state.selectedAddons.includes(addon.key)) {
        addonItems.push({
          description: addon.label,
          quantity: 1,
          unit: "lot",
          unit_price: addon.basePrice,
          markup_percentage: 0,
        })
      }
    }
  }

  if (addonItems.length > 0) {
    rooms.push({
      name: "Add-ons & Services",
      area_sqft: undefined,
      items: addonItems,
    })
  }

  // Build notes with metadata
  const noteParts = [
    `Package: ${pkg?.label ?? "Standard"}`,
    `Property: ${state.projectDetails.propertyType} | ${state.projectDetails.flatSizeSqft} sqft`,
    `City: ${state.projectDetails.city}`,
    `Materials: ${mats.wood.replace(/_/g, " ")} + ${mats.finish}`,
    `Hardware: ${mats.hardware.replace(/_/g, " ")}`,
  ]
  if (state.discount.flatPercent && parseFloat(state.discount.flatPercent) > 0) {
    noteParts.push(`Discount: ${state.discount.flatPercent}%`)
  }

  // Serialize room builder configs into notes (category-based BOQ format)
  const builderData = state.roomBuilderData
  if (Object.keys(builderData).length > 0) {
    noteParts.push("")
    noteParts.push("=== DETAILED ROOM CONFIGURATIONS (BOQ) ===")
    for (const [roomKey, cfg] of Object.entries(builderData)) {
      const roomLabel = state.rooms.find((r) => r.key === roomKey)?.label ?? roomKey
      noteParts.push("")
      noteParts.push(`── ${roomLabel} ──`)

      // Group items by category
      const byCategory = new Map<string, typeof cfg.items>()
      for (const item of cfg.items) {
        const list = byCategory.get(item.category) || []
        list.push(item)
        byCategory.set(item.category, list)
      }

      for (const [cat, items] of byCategory) {
        noteParts.push(`  [${cat.replace(/_/g, " ")}]`)
        for (const it of items) {
          let line = `    • ${it.name}`
          if (it.length || it.width || it.height) {
            line += ` (${it.length}×${it.width}×${it.height} ft)`
          }
          if (it.quantity > 1) line += ` × ${it.quantity} ${it.unit}`
          if (it.material) line += ` | ${it.material}`
          if (it.finish) line += ` / ${it.finish}`
          if (it.hardware) line += ` / ${it.hardware}`
          if (it.placement) line += ` [${it.placement.replace(/_/g, " ")}]`
          const activeSubs = it.subItems.filter((s) => s.quantity > 0)
          if (activeSubs.length > 0) {
            line += ` {${activeSubs.map((s) => `${s.name}: ${s.quantity}${s.notes ? ` (${s.notes})` : ""}`).join(", ")}}`
          }
          if (it.notes) line += ` — ${it.notes}`
          noteParts.push(line)
        }
      }

      // Electrical summary
      const el = cfg.electrical
      const elParts: string[] = []
      if (el.switchBoards) elParts.push(`${el.switchBoards} switch boards`)
      if (el.plugPoints5amp) elParts.push(`${el.plugPoints5amp}×5A plugs`)
      if (el.plugPoints15amp) elParts.push(`${el.plugPoints15amp}×15A plugs`)
      if (el.lightsCeiling) elParts.push(`${el.lightsCeiling} ceiling lights`)
      if (el.lightsWall) elParts.push(`${el.lightsWall} wall lights`)
      if (el.lightsCove) elParts.push(`${el.lightsCove} cove lights`)
      if (el.lightsSpot) elParts.push(`${el.lightsSpot} spots`)
      if (el.acPoints) elParts.push(`${el.acPoints} AC (${el.acType})`)
      if (el.fanPoints) elParts.push(`${el.fanPoints} fan pts`)
      if (el.tvPoints) elParts.push(`${el.tvPoints} TV pts`)
      if (el.dataPoints) elParts.push(`${el.dataPoints} data pts`)
      if (el.exhaustFan) elParts.push(`${el.exhaustFan} exhaust`)
      if (el.gyserPoint) elParts.push(`${el.gyserPoint} geyser`)
      if (el.washerPoint) elParts.push(`${el.washerPoint} washer`)
      if (elParts.length > 0) {
        noteParts.push(`  [ELECTRICAL] ${elParts.join(", ")}`)
      }
      if (el.notes) noteParts.push(`    Note: ${el.notes}`)
      if (cfg.designNotes) noteParts.push(`  [DESIGN NOTES] ${cfg.designNotes}`)
    }
  }

  return {
    lead_id: state.projectDetails.leadId,
    notes: noteParts.join("\n"),
    rooms,
  }
}

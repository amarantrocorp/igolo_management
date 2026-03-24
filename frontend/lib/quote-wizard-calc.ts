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

  return {
    lead_id: state.projectDetails.leadId,
    notes: noteParts.join("\n"),
    rooms,
  }
}

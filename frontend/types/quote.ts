// Shared form-state types used by both the Quote Form and Quote Preview

import { formatCurrency } from "@/lib/utils"

export interface QuoteItemForm {
  id: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  markup_percentage: string
  inventory_item_id?: string
}

export interface QuoteRoomForm {
  id: string
  name: string
  area_sqft: string
  items: QuoteItemForm[]
}

export function calcItemTotal(item: QuoteItemForm): number {
  const qty = parseFloat(item.quantity) || 0
  const price = parseFloat(item.unit_price) || 0
  const markup = parseFloat(item.markup_percentage) || 0
  return qty * price * (1 + markup / 100)
}

export function calcRoomTotal(room: QuoteRoomForm): number {
  return room.items.reduce((sum, item) => sum + calcItemTotal(item), 0)
}

export const formatINR = formatCurrency

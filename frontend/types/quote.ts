// Shared form-state types used by both the Quote Form and Quote Preview

export interface QuoteItemForm {
  id: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  markup_percentage: string
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

export function formatINR(value: number): string {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  })
}

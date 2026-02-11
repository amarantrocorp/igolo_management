"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Item, Quotation } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  Home,
  DollarSign,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const quoteItemSchema = z.object({
  item_id: z.string().min(1, "Select an item"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  markup: z.coerce.number().min(0, "Markup cannot be negative").default(20),
})

const quoteRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  area_sqft: z.coerce.number().min(0).default(0),
  items: z.array(quoteItemSchema).min(1, "Add at least one item"),
})

const quoteFormSchema = z.object({
  lead_id: z.string().optional(),
  rooms: z.array(quoteRoomSchema).min(1, "Add at least one room"),
})

type QuoteFormValues = z.infer<typeof quoteFormSchema>

const ROOM_PRESETS = [
  "Master Bedroom",
  "Kitchen",
  "Living Room",
  "Guest Bedroom",
  "Bathroom",
  "Study Room",
  "Dining Room",
  "Balcony",
  "Kids Room",
  "Pooja Room",
]

export default function QuoteBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const quoteId = params.id as string
  const isNew = quoteId === "new"

  // Fetch inventory items for dropdown
  const { data: inventoryItems = [] } = useQuery<Item[]>({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const response = await api.get("/inventory/items")
      return response.data.items ?? response.data
    },
  })

  // Fetch existing quote if editing
  const { data: existingQuote, isLoading: isLoadingQuote } =
    useQuery<Quotation>({
      queryKey: ["quotation", quoteId],
      queryFn: async () => {
        const response = await api.get(`/quotes/${quoteId}`)
        return response.data
      },
      enabled: !isNew,
    })

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      lead_id: "",
      rooms: [
        {
          name: "",
          area_sqft: 0,
          items: [{ item_id: "", description: "", quantity: 1, markup: 20 }],
        },
      ],
    },
  })

  // Populate form when editing an existing quote
  useEffect(() => {
    if (existingQuote && !isNew) {
      const formRooms = existingQuote.rooms.map((room) => ({
        name: room.name,
        area_sqft: room.area_sqft,
        items: room.items.map((item) => ({
          item_id: item.inventory_item_id,
          description: item.description,
          quantity: item.quantity,
          markup: item.markup_percentage,
        })),
      }))
      form.reset({
        lead_id: existingQuote.lead_id,
        rooms: formRooms.length > 0 ? formRooms : [
          {
            name: "",
            area_sqft: 0,
            items: [{ item_id: "", description: "", quantity: 1, markup: 20 }],
          },
        ],
      })
    }
  }, [existingQuote, isNew, form])

  const {
    fields: roomFields,
    append: appendRoom,
    remove: removeRoom,
  } = useFieldArray({
    control: form.control,
    name: "rooms",
  })

  // Save as draft
  const saveMutation = useMutation({
    mutationFn: async (data: QuoteFormValues) => {
      const payload = {
        lead_id: data.lead_id,
        rooms: data.rooms.map((room) => ({
          name: room.name,
          area_sqft: room.area_sqft,
          items: room.items.map((item) => {
            const inventoryItem = inventoryItems.find(
              (i) => i.id === item.item_id
            )
            const unitPrice = inventoryItem?.base_price ?? 0
            const finalPrice =
              unitPrice * item.quantity * (1 + item.markup / 100)
            return {
              inventory_item_id: item.item_id,
              description: item.description || inventoryItem?.name || "",
              quantity: item.quantity,
              unit_price: unitPrice,
              markup_percentage: item.markup,
              final_price: finalPrice,
            }
          }),
        })),
      }

      if (isNew) {
        const response = await api.post("/quotes", payload)
        return response.data
      } else {
        const response = await api.put(`/quotes/${quoteId}`, payload)
        return response.data
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] })
      toast({
        title: "Quote saved",
        description: "Quotation has been saved as draft.",
      })
      if (isNew && data?.id) {
        router.push(`/sales/quotes/${data.id}`)
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save quotation.",
        variant: "destructive",
      })
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/quotes/${quoteId}/finalize`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation", quoteId] })
      queryClient.invalidateQueries({ queryKey: ["quotations"] })
      toast({
        title: "Quote finalized",
        description: "Quotation has been locked and versioned.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to finalize quotation.",
        variant: "destructive",
      })
    },
  })

  // Watch all rooms for live total calculation
  const watchedRooms = useWatch({ control: form.control, name: "rooms" })

  const calculateItemTotal = useCallback(
    (itemId: string, quantity: number, markup: number) => {
      const item = inventoryItems.find((i) => i.id === itemId)
      if (!item) return 0
      return item.base_price * quantity * (1 + markup / 100)
    },
    [inventoryItems]
  )

  const roomTotals = useMemo(() => {
    return (watchedRooms || []).map((room) => {
      if (!room?.items) return 0
      return room.items.reduce((sum, item) => {
        if (!item?.item_id) return sum
        return sum + calculateItemTotal(item.item_id, item.quantity || 0, item.markup || 0)
      }, 0)
    })
  }, [watchedRooms, calculateItemTotal])

  const grandTotal = useMemo(() => {
    return roomTotals.reduce((sum, total) => sum + total, 0)
  }, [roomTotals])

  if (!isNew && isLoadingQuote) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isFinalized =
    existingQuote?.status !== "DRAFT" && existingQuote?.status !== undefined
  const canEdit = isNew || existingQuote?.status === "DRAFT"

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/sales/quotes")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {isNew ? "New Quotation" : `Quote QT-${quoteId.slice(0, 8).toUpperCase()}`}
              </h2>
              <div className="flex items-center gap-2 text-muted-foreground">
                {existingQuote && (
                  <>
                    <Badge variant="outline">
                      v{existingQuote.version}
                    </Badge>
                    <Badge
                      variant={
                        existingQuote.status === "DRAFT"
                          ? "secondary"
                          : existingQuote.status === "APPROVED"
                          ? "success"
                          : "default"
                      }
                    >
                      {existingQuote.status}
                    </Badge>
                  </>
                )}
                {isNew && <Badge variant="secondary">New Draft</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  onClick={form.handleSubmit((data) =>
                    saveMutation.mutate(data)
                  )}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Draft
                </Button>
                {!isNew && (
                  <Button
                    onClick={() => finalizeMutation.mutate()}
                    disabled={finalizeMutation.isPending}
                  >
                    {finalizeMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Finalize
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isFinalized && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            This quotation has been finalized and cannot be edited. Create a new
            version to make changes.
          </div>
        )}

        {/* Rooms */}
        <form className="space-y-6">
          {roomFields.map((roomField, roomIndex) => (
            <RoomSection
              key={roomField.id}
              roomIndex={roomIndex}
              form={form}
              inventoryItems={inventoryItems}
              roomTotal={roomTotals[roomIndex] ?? 0}
              canEdit={canEdit}
              calculateItemTotal={calculateItemTotal}
              onRemove={() => {
                if (roomFields.length > 1) {
                  removeRoom(roomIndex)
                }
              }}
            />
          ))}

          {canEdit && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  appendRoom({
                    name: "",
                    area_sqft: 0,
                    items: [
                      { item_id: "", description: "", quantity: 1, markup: 20 },
                    ],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>

              <Select
                onValueChange={(value) =>
                  appendRoom({
                    name: value,
                    area_sqft: 0,
                    items: [
                      { item_id: "", description: "", quantity: 1, markup: 20 },
                    ],
                  })
                }
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Quick add room..." />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      <div className="flex items-center gap-2">
                        <Home className="h-3 w-3" />
                        {preset}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form>

        {/* Sticky Total Footer */}
        <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {roomFields.length} room(s) |{" "}
                {watchedRooms?.reduce(
                  (sum, room) => sum + (room?.items?.length ?? 0),
                  0
                ) ?? 0}{" "}
                item(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Quote Value
                </p>
                <p className="text-2xl font-bold">
                  ${grandTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

// Room section component
function RoomSection({
  roomIndex,
  form,
  inventoryItems,
  roomTotal,
  canEdit,
  calculateItemTotal,
  onRemove,
}: {
  roomIndex: number
  form: ReturnType<typeof useForm<QuoteFormValues>>
  inventoryItems: Item[]
  roomTotal: number
  canEdit: boolean
  calculateItemTotal: (itemId: string, quantity: number, markup: number) => number
  onRemove: () => void
}) {
  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control: form.control,
    name: `rooms.${roomIndex}.items`,
  })

  const watchedItems = useWatch({
    control: form.control,
    name: `rooms.${roomIndex}.items`,
  })

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Home className="h-5 w-5 text-primary" />
            <div className="flex-1">
              {canEdit ? (
                <Input
                  placeholder="Room name (e.g., Master Bedroom)"
                  className="text-lg font-semibold border-0 p-0 h-auto shadow-none focus-visible:ring-0"
                  {...form.register(`rooms.${roomIndex}.name`)}
                />
              ) : (
                <CardTitle className="text-lg">
                  {form.getValues(`rooms.${roomIndex}.name`) || "Unnamed Room"}
                </CardTitle>
              )}
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Area (sqft)
                  </Label>
                  <Input
                    type="number"
                    className="w-24 h-8"
                    {...form.register(`rooms.${roomIndex}.area_sqft`)}
                  />
                </div>
              )}
              <Badge variant="outline" className="whitespace-nowrap">
                ${roomTotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Badge>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onRemove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {form.formState.errors.rooms?.[roomIndex]?.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.rooms[roomIndex]?.name?.message}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Item Header */}
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
          <div className="col-span-4">Item</div>
          <div className="col-span-2">Qty</div>
          <div className="col-span-1">Unit Price</div>
          <div className="col-span-2">Markup %</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-1" />
        </div>

        {/* Item Rows */}
        {itemFields.map((itemField, itemIndex) => {
          const watchedItem = watchedItems?.[itemIndex]
          const selectedItem = inventoryItems.find(
            (i) => i.id === watchedItem?.item_id
          )
          const unitPrice = selectedItem?.base_price ?? 0
          const itemTotal = calculateItemTotal(
            watchedItem?.item_id ?? "",
            watchedItem?.quantity ?? 0,
            watchedItem?.markup ?? 0
          )

          return (
            <div
              key={itemField.id}
              className="grid grid-cols-12 gap-2 items-center"
            >
              <div className="col-span-4">
                {canEdit ? (
                  <Select
                    value={form.watch(
                      `rooms.${roomIndex}.items.${itemIndex}.item_id`
                    )}
                    onValueChange={(value) => {
                      form.setValue(
                        `rooms.${roomIndex}.items.${itemIndex}.item_id`,
                        value
                      )
                      const item = inventoryItems.find((i) => i.id === value)
                      if (item) {
                        form.setValue(
                          `rooms.${roomIndex}.items.${itemIndex}.description`,
                          item.name
                        )
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          <div className="flex items-center justify-between gap-2">
                            <span>{item.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ${item.base_price}/{item.unit}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-sm">
                    {selectedItem?.name ?? watchedItem?.description ?? "--"}
                  </span>
                )}
              </div>

              <div className="col-span-2">
                {canEdit ? (
                  <Input
                    type="number"
                    step="0.01"
                    className="h-9"
                    placeholder="Qty"
                    {...form.register(
                      `rooms.${roomIndex}.items.${itemIndex}.quantity`
                    )}
                  />
                ) : (
                  <span className="text-sm">{watchedItem?.quantity ?? 0}</span>
                )}
              </div>

              <div className="col-span-1">
                <span className="text-sm text-muted-foreground">
                  ${unitPrice.toLocaleString()}
                </span>
              </div>

              <div className="col-span-2">
                {canEdit ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-9"
                      placeholder="%"
                      {...form.register(
                        `rooms.${roomIndex}.items.${itemIndex}.markup`
                      )}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                ) : (
                  <span className="text-sm">
                    {watchedItem?.markup ?? 0}%
                  </span>
                )}
              </div>

              <div className="col-span-2 text-right">
                <span className="font-medium">
                  ${itemTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              <div className="col-span-1 flex justify-end">
                {canEdit && itemFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(itemIndex)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {form.formState.errors.rooms?.[roomIndex]?.items && (
          <p className="text-xs text-destructive">
            {typeof form.formState.errors.rooms[roomIndex]?.items?.message === "string"
              ? form.formState.errors.rooms[roomIndex]?.items?.message
              : "Please fill in all required item fields"}
          </p>
        )}

        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              appendItem({
                item_id: "",
                description: "",
                quantity: 1,
                markup: 20,
              })
            }
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Item
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

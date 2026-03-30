"use client"

import { useState, useCallback, useMemo } from "react"

const uid = () => crypto.randomUUID()

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  StickyNote,
  Hammer,
  Save,
} from "lucide-react"
import {
  getCatalogForRoom,
  WORK_CATEGORIES,
  PLACEMENT_OPTIONS,
} from "@/lib/room-builder-catalogs"
import type {
  WorkCategory,
  PlacementTag,
  RoomBuilderConfig,
  RoomBuilderItem,
  RoomBuilderSubItem,
  RoomElectricalPlan,
  WizardSelectedRoom,
  CatalogItemDef,
} from "@/types/quote-wizard"

// ── Helpers ──

function emptyElectrical(): RoomElectricalPlan {
  return {
    switchBoards: 0, plugPoints5amp: 0, plugPoints15amp: 0,
    lightsCeiling: 0, lightsWall: 0, lightsCove: 0, lightsSpot: 0,
    acPoints: 0, acType: "Split", fanPoints: 0, tvPoints: 0,
    dataPoints: 0, exhaustFan: 0, gyserPoint: 0, washerPoint: 0,
    notes: "",
  }
}

function emptyConfig(): RoomBuilderConfig {
  return { items: [], electrical: emptyElectrical(), designNotes: "" }
}

function catalogToItem(cat: CatalogItemDef): RoomBuilderItem {
  return {
    id: uid(),
    category: cat.category,
    name: cat.name,
    description: "",
    length: cat.defaultLength,
    width: cat.defaultWidth,
    height: cat.defaultHeight,
    unit: cat.defaultUnit,
    quantity: 1,
    placement: "none",
    material: cat.defaultMaterial,
    finish: cat.defaultFinish,
    hardware: "",
    notes: "",
    subItems: cat.subItems.map((si) => ({
      id: uid(),
      name: si.name,
      quantity: si.defaultQty,
      notes: "",
    })),
  }
}

// ── Props ──

interface RoomBuilderModalProps {
  open: boolean
  onClose: () => void
  room: WizardSelectedRoom
  initialConfig?: RoomBuilderConfig
  onSave: (config: RoomBuilderConfig) => void
}

// ── Main Component ──

export default function RoomBuilderModal({
  open,
  onClose,
  room,
  initialConfig,
  onSave,
}: RoomBuilderModalProps) {
  const [config, setConfig] = useState<RoomBuilderConfig>(
    () => initialConfig ? { ...initialConfig } : emptyConfig()
  )
  const catalogItems = useMemo(() => getCatalogForRoom(room.key), [room.key])

  // Group items by category for display
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<WorkCategory, RoomBuilderItem[]>()
    for (const item of config.items) {
      const list = grouped.get(item.category) || []
      list.push(item)
      grouped.set(item.category, list)
    }
    return grouped
  }, [config.items])

  // ── Item CRUD ──

  const addFromCatalog = useCallback((cat: CatalogItemDef) => {
    setConfig((prev) => ({
      ...prev,
      items: [...prev.items, catalogToItem(cat)],
    }))
  }, [])

  const addCustomItem = useCallback((category: WorkCategory) => {
    const newItem: RoomBuilderItem = {
      id: uid(), category, name: "Custom Item", description: "",
      length: 0, width: 0, height: 0, unit: "nos", quantity: 1,
      placement: "none", material: "", finish: "", hardware: "", notes: "",
      subItems: [],
    }
    setConfig((prev) => ({ ...prev, items: [...prev.items, newItem] }))
  }, [])

  const updateItem = useCallback((id: string, partial: Partial<RoomBuilderItem>) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.map((it) => it.id === id ? { ...it, ...partial } : it),
    }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setConfig((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.id !== id),
    }))
  }, [])

  const updateSubItem = useCallback(
    (itemId: string, subId: string, partial: Partial<RoomBuilderSubItem>) => {
      setConfig((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.id === itemId
            ? {
                ...it,
                subItems: it.subItems.map((si) =>
                  si.id === subId ? { ...si, ...partial } : si
                ),
              }
            : it
        ),
      }))
    },
    []
  )

  const updateElectrical = useCallback((partial: Partial<RoomElectricalPlan>) => {
    setConfig((prev) => ({
      ...prev,
      electrical: { ...prev.electrical, ...partial },
    }))
  }, [])

  const handleSave = () => {
    onSave(config)
    onClose()
  }

  const dims = room.dimensions
  const totalItems = config.items.length

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg">{room.label} — Room Builder</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {dims.length || "?"} × {dims.breadth || "?"} × {dims.height || "9"} ft (L×B×H)
            {totalItems > 0 && <> · {totalItems} items configured</>}
          </p>
        </DialogHeader>

        <Tabs defaultValue="items" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0 grid w-full grid-cols-3">
            <TabsTrigger value="items" className="gap-1.5">
              <Hammer className="h-3.5 w-3.5" />
              Items & Specs
            </TabsTrigger>
            <TabsTrigger value="electrical" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Electrical
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Items grouped by work category ── */}
          <TabsContent value="items" className="flex-1 overflow-auto space-y-4 mt-4">
            {/* Add item controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select onValueChange={(key) => {
                const cat = catalogItems.find((c) => c.key === key)
                if (cat) addFromCatalog(cat)
              }}>
                <SelectTrigger className="h-9 w-56 text-sm">
                  <SelectValue placeholder="+ Add from catalog..." />
                </SelectTrigger>
                <SelectContent>
                  {WORK_CATEGORIES.map((wc) => {
                    const catItems = catalogItems.filter((c) => c.category === wc.key)
                    if (catItems.length === 0) return null
                    return (
                      <div key={wc.key}>
                        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {wc.label}
                        </div>
                        {catItems.map((c) => (
                          <SelectItem key={c.key} value={c.key}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </div>
                    )
                  })}
                </SelectContent>
              </Select>

              <Select onValueChange={(cat) => addCustomItem(cat as WorkCategory)}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue placeholder="+ Custom item..." />
                </SelectTrigger>
                <SelectContent>
                  {WORK_CATEGORIES.map((wc) => (
                    <SelectItem key={wc.key} value={wc.key}>
                      {wc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items grouped by category */}
            {WORK_CATEGORIES.map((wc) => {
              const items = itemsByCategory.get(wc.key)
              if (!items || items.length === 0) return null
              return (
                <div key={wc.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                      {wc.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {items.length} item{items.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onUpdate={(p) => updateItem(item.id, p)}
                      onRemove={() => removeItem(item.id)}
                      onUpdateSubItem={(subId, p) => updateSubItem(item.id, subId, p)}
                    />
                  ))}
                </div>
              )
            })}

            {config.items.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No items configured yet. Use the dropdowns above to add items from the catalog.
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Electrical ── */}
          <TabsContent value="electrical" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Counter label="Switch Boards" value={config.electrical.switchBoards}
                onChange={(v) => updateElectrical({ switchBoards: v })} />
              <Counter label="5A Plug Points" value={config.electrical.plugPoints5amp}
                onChange={(v) => updateElectrical({ plugPoints5amp: v })} />
              <Counter label="15A Plug Points" value={config.electrical.plugPoints15amp}
                onChange={(v) => updateElectrical({ plugPoints15amp: v })} />
              <Counter label="Ceiling Lights" value={config.electrical.lightsCeiling}
                onChange={(v) => updateElectrical({ lightsCeiling: v })} />
              <Counter label="Wall Lights" value={config.electrical.lightsWall}
                onChange={(v) => updateElectrical({ lightsWall: v })} />
              <Counter label="Cove Lights" value={config.electrical.lightsCove}
                onChange={(v) => updateElectrical({ lightsCove: v })} />
              <Counter label="Spot Lights" value={config.electrical.lightsSpot}
                onChange={(v) => updateElectrical({ lightsSpot: v })} />
              <Counter label="AC Points" value={config.electrical.acPoints}
                onChange={(v) => updateElectrical({ acPoints: v })} />
              <Counter label="Fan Points" value={config.electrical.fanPoints}
                onChange={(v) => updateElectrical({ fanPoints: v })} />
              <Counter label="TV Points" value={config.electrical.tvPoints}
                onChange={(v) => updateElectrical({ tvPoints: v })} />
              <Counter label="Data / LAN Points" value={config.electrical.dataPoints}
                onChange={(v) => updateElectrical({ dataPoints: v })} />
              <Counter label="Exhaust Fan" value={config.electrical.exhaustFan}
                onChange={(v) => updateElectrical({ exhaustFan: v })} />
              <Counter label="Geyser Point" value={config.electrical.gyserPoint}
                onChange={(v) => updateElectrical({ gyserPoint: v })} />
              <Counter label="Washer Point" value={config.electrical.washerPoint}
                onChange={(v) => updateElectrical({ washerPoint: v })} />
            </div>
            {config.electrical.acPoints > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">AC Type:</Label>
                <Select value={config.electrical.acType} onValueChange={(v) => updateElectrical({ acType: v })}>
                  <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Split">Split</SelectItem>
                    <SelectItem value="Window">Window</SelectItem>
                    <SelectItem value="Cassette">Cassette</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Electrical Notes</Label>
              <Textarea
                rows={3}
                placeholder="Switch height, concealed wiring notes, brand preferences..."
                className="text-sm"
                value={config.electrical.notes}
                onChange={(e) => updateElectrical({ notes: e.target.value })}
              />
            </div>
          </TabsContent>

          {/* ── Tab 3: Notes & Summary ── */}
          <TabsContent value="notes" className="flex-1 overflow-auto space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Design Notes & Instructions</Label>
              <Textarea
                rows={5}
                placeholder="Client preferences, material notes, special instructions, reference images..."
                value={config.designNotes}
                onChange={(e) => setConfig((prev) => ({ ...prev, designNotes: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Auto-generated Summary</Label>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1 max-h-60 overflow-auto font-mono">
                {WORK_CATEGORIES.map((wc) => {
                  const items = itemsByCategory.get(wc.key)
                  if (!items || items.length === 0) return null
                  return (
                    <div key={wc.key} className="mb-2">
                      <p className="font-bold">{wc.label}:</p>
                      {items.map((it) => (
                        <p key={it.id} className="ml-3">
                          • {it.name}
                          {(it.length > 0 || it.width > 0 || it.height > 0) &&
                            ` (${it.length}×${it.width}×${it.height} ft)`}
                          {it.material && ` — ${it.material}`}
                          {it.finish && ` / ${it.finish}`}
                          {it.placement && ` [${PLACEMENT_OPTIONS.find((p) => p.value === it.placement)?.label ?? it.placement}]`}
                          {it.subItems.filter((s) => s.quantity > 0).length > 0 && (
                            <span className="text-muted-foreground">
                              {" "}{`{${it.subItems.filter((s) => s.quantity > 0).map((s) => `${s.name}: ${s.quantity}`).join(", ")}}`}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  )
                })}
                {config.items.length === 0 && (
                  <p className="text-muted-foreground italic">No items configured yet.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Item Card ──

function ItemCard({
  item,
  onUpdate,
  onRemove,
  onUpdateSubItem,
}: {
  item: RoomBuilderItem
  onUpdate: (partial: Partial<RoomBuilderItem>) => void
  onRemove: () => void
  onUpdateSubItem: (subId: string, partial: Partial<RoomBuilderSubItem>) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border bg-background p-3 space-y-2">
      {/* Row 1: Name + delete */}
      <div className="flex items-center gap-2">
        <Input
          className="h-8 text-sm font-medium flex-1"
          value={item.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      {/* Row 2: Dimensions + Qty + Placement */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Input type="number" className="w-14 h-7 text-xs" placeholder="L"
            value={item.length || ""} onChange={(e) => onUpdate({ length: +e.target.value })} />
          <span className="text-xs text-muted-foreground">×</span>
          <Input type="number" className="w-14 h-7 text-xs" placeholder="W"
            value={item.width || ""} onChange={(e) => onUpdate({ width: +e.target.value })} />
          <span className="text-xs text-muted-foreground">×</span>
          <Input type="number" className="w-14 h-7 text-xs" placeholder="H"
            value={item.height || ""} onChange={(e) => onUpdate({ height: +e.target.value })} />
          <span className="text-[10px] text-muted-foreground">ft</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Qty:</span>
          <Input type="number" className="w-14 h-7 text-xs"
            value={item.quantity} onChange={(e) => onUpdate({ quantity: +e.target.value })} />
          <Input className="w-14 h-7 text-xs" placeholder="unit"
            value={item.unit} onChange={(e) => onUpdate({ unit: e.target.value })} />
        </div>

        <Select value={item.placement} onValueChange={(v) => onUpdate({ placement: v as PlacementTag })}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue placeholder="Placement" />
          </SelectTrigger>
          <SelectContent>
            {PLACEMENT_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 3: Material / Finish / Hardware */}
      <div className="flex gap-2">
        <Input className="h-7 text-xs flex-1" placeholder="Material..."
          value={item.material} onChange={(e) => onUpdate({ material: e.target.value })} />
        <Input className="h-7 text-xs flex-1" placeholder="Finish..."
          value={item.finish} onChange={(e) => onUpdate({ finish: e.target.value })} />
        <Input className="h-7 text-xs flex-1" placeholder="Hardware..."
          value={item.hardware} onChange={(e) => onUpdate({ hardware: e.target.value })} />
      </div>

      {/* Row 4: Notes */}
      <Input className="h-7 text-xs" placeholder="Special notes / instructions..."
        value={item.notes} onChange={(e) => onUpdate({ notes: e.target.value })} />

      {/* Sub-items */}
      {item.subItems.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {item.subItems.length} components / options
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 pl-3 border-l-2 border-blue-200">
              {item.subItems.map((si) => (
                <div key={si.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-44 truncate">{si.name}</span>
                  <Input type="number" className="w-14 h-6 text-xs"
                    value={si.quantity} onChange={(e) => onUpdateSubItem(si.id, { quantity: +e.target.value })} />
                  <Input className="h-6 text-xs flex-1" placeholder="Notes..."
                    value={si.notes} onChange={(e) => onUpdateSubItem(si.id, { notes: e.target.value })} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Counter widget ──

function Counter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
      <span className="text-xs">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" className="h-6 w-6 rounded bg-muted text-xs font-bold hover:bg-muted/80"
          onClick={() => onChange(Math.max(0, value - 1))}>−</button>
        <span className="w-6 text-center text-xs font-semibold">{value}</span>
        <button type="button" className="h-6 w-6 rounded bg-muted text-xs font-bold hover:bg-muted/80"
          onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}

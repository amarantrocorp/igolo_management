// ============================================================
// Smart Quotation Wizard — Type Definitions
// ============================================================

// ── Enums & Literals ──

export type PropertyType =
  | "1BHK" | "2BHK" | "3BHK" | "4BHK"
  | "VILLA" | "PENTHOUSE" | "OFFICE" | "COMMERCIAL"

export type PackageType = "BASIC" | "STANDARD" | "PREMIUM" | "LUXURY"

export type BudgetRange =
  | "Under 5L" | "5-10L" | "10-15L" | "15-25L" | "25-50L" | "50L+"

export type WoodMaterial = "COMMERCIAL_PLY" | "BWR_PLY" | "BWP_PLY" | "HDHMR"
export type FinishType = "LAMINATE" | "ACRYLIC" | "PU" | "VENEER"
export type HardwarePackage = "BASIC" | "HETTICH_STD" | "HETTICH_PREMIUM" | "BLUM"
export type CountertopType = "GRANITE" | "QUARTZ" | "SINTERED_STONE" | "CORIAN"

export type RoomTypeKey =
  | "LIVING_ROOM" | "DINING_AREA" | "KITCHEN" | "UTILITY"
  | "MASTER_BEDROOM" | "GUEST_BEDROOM" | "KIDS_BEDROOM"
  | "POOJA_ROOM" | "FOYER" | "BALCONY" | "STUDY_ROOM"
  | "TV_UNIT_AREA" | "BAR_UNIT" | "SHOE_RACK_AREA"
  | string // custom rooms

export type ItemTier = "RECOMMENDED" | "OPTIONAL" | "PREMIUM"

// ── Quantity Formula ──

export type QuantityFormula =
  | { type: "fixed"; value: number }
  | { type: "length" }
  | { type: "width" }
  | { type: "floor_area" }
  | { type: "wall_area" }
  | { type: "perimeter" }
  | { type: "wall_length"; wallCount: number }

// ── Room & Item Definitions (constants) ──

export interface RoomItemDefinition {
  key: string
  label: string
  tier: ItemTier
  unit: string
  baseRatePerUnit: number
  quantityFormula: QuantityFormula
}

export interface RoomDefinition {
  key: string
  label: string
  icon: string
  defaultForPropertyTypes: PropertyType[]
  items: RoomItemDefinition[]
}

// ── Material Definitions ──

export interface MaterialOption {
  key: string
  label: string
  priceMultiplier: number
}

export interface MaterialCategory {
  key: string
  label: string
  description: string
  options: MaterialOption[]
  defaultKey: string
}

// ── Add-on Definitions ──

export interface AddonDefinition {
  key: string
  label: string
  basePrice: number
}

export interface AddonCategory {
  key: string
  label: string
  icon: string
  items: AddonDefinition[]
}

// ── Package Definitions ──

export interface PackageDefinition {
  key: PackageType
  label: string
  icon: string
  description: string
  defaultWood: WoodMaterial
  defaultFinish: FinishType
  defaultHardware: HardwarePackage
  defaultCountertop: CountertopType
  priceMultiplier: number
}

// ── User's Wizard State ──

export interface WizardProjectDetails {
  leadId: string
  clientName: string
  clientEmail: string
  clientPhone: string
  projectName: string
  city: string
  propertyType: PropertyType | ""
  flatSizeSqft: string
  budgetRange: BudgetRange | ""
  packageType: PackageType | ""
}

export interface WizardRoomDimensions {
  length: string
  breadth: string
  height: string
}

export interface WizardSelectedRoom {
  key: string
  label: string
  dimensions: WizardRoomDimensions
  selectedItemKeys: string[]
  isCustom?: boolean
}

export interface WizardMaterialSelection {
  wood: WoodMaterial
  finish: FinishType
  hardware: HardwarePackage
  countertop: CountertopType
}

export interface WizardMaterials {
  applyToAll: boolean
  global: WizardMaterialSelection
  perRoom: Record<string, WizardMaterialSelection>
}

export interface WizardDiscount {
  flatPercent: string
}

export interface WizardCostBreakdown {
  baseCost: number
  materialUpgrade: number
  hardwareUpgrade: number
  addonsCost: number
  subtotal: number
  discountAmount: number
  gst: number
  finalAmount: number
}

export type WizardEntryMode = "scratch" | "upload" | "template" | "reuse" | null

export interface WizardState {
  currentStep: number // 0 = start, 1-7 = steps
  entryMode: WizardEntryMode
  uploadedLayoutUrl: string | null

  projectDetails: WizardProjectDetails
  rooms: WizardSelectedRoom[]
  materials: WizardMaterials
  selectedAddons: string[] // addon keys
  discount: WizardDiscount

  costBreakdown: WizardCostBreakdown

  // Room Builder data per room
  roomBuilderData: Record<string, RoomBuilderConfig>
}

// ── Room Builder Types (Category-based BOQ approach) ──

/** Work categories — matches how the interior design industry operates */
export type WorkCategory =
  | "WOODWORK"
  | "FALSE_CEILING"
  | "ELECTRICAL"
  | "PAINTING"
  | "FLOORING"
  | "COUNTERTOP_STONE"
  | "FIXTURES_FITTINGS"
  | "SOFT_FURNISHING"
  | "MISCELLANEOUS"

export type PlacementTag =
  | "none" | "wall_a" | "wall_b" | "wall_c" | "wall_d"
  | "island" | "center" | "corner"
  | "window_side" | "ceiling" | "floor" | "full_room"

/** A single line item in the BOQ */
export interface RoomBuilderItem {
  id: string
  category: WorkCategory
  name: string               // "3-Door Wardrobe", "Peripheral False Ceiling"
  description: string        // Detailed spec: "BWR Ply + Laminate, soft-close Hettich"
  length: number             // feet (0 = not applicable)
  width: number              // feet
  height: number             // feet
  unit: string               // "sqft", "rft", "nos", "lot"
  quantity: number
  placement: PlacementTag    // optional placement hint
  material: string           // "BWR Ply", "Gypsum", etc.
  finish: string             // "Laminate", "PU Paint", etc.
  hardware: string           // "Hettich Premium", "Blum", etc.
  notes: string              // special instructions
  subItems: RoomBuilderSubItem[]  // internal components
}

export interface RoomBuilderSubItem {
  id: string
  name: string
  quantity: number
  notes: string
}

/** Electrical plan for the entire room */
export interface RoomElectricalPlan {
  switchBoards: number
  plugPoints5amp: number
  plugPoints15amp: number
  lightsCeiling: number
  lightsWall: number
  lightsCove: number
  lightsSpot: number
  acPoints: number
  acType: string             // "Split", "Window", "Cassette"
  fanPoints: number
  tvPoints: number
  dataPoints: number
  exhaustFan: number
  gyserPoint: number
  washerPoint: number
  notes: string              // "All switches at 4ft height", etc.
}

/** Complete Room Builder config */
export interface RoomBuilderConfig {
  items: RoomBuilderItem[]
  electrical: RoomElectricalPlan
  designNotes: string
}

// ── Catalog definitions for room-type suggestions ──

export interface CatalogSubItemDef {
  name: string
  defaultQty: number
}

export interface CatalogItemDef {
  key: string
  name: string
  category: WorkCategory
  defaultLength: number
  defaultWidth: number
  defaultHeight: number
  defaultUnit: string
  defaultMaterial: string
  defaultFinish: string
  subItems: CatalogSubItemDef[]
}

export interface RoomCatalog {
  roomKeys: string[]
  items: CatalogItemDef[]
}

// ── Floor Plan AI Analysis Result ──

export interface DetectedRoom {
  name: string
  matched_key: string | null
  length_ft: number | null
  breadth_ft: number | null
  height_ft: number
  area_sqft: number | null
  suggested_items: string[]
}

export interface FloorPlanAnalysis {
  property_type: string | null
  bhk_config: string | null
  total_carpet_area_sqft: number | null
  rooms: DetectedRoom[]
  suggested_scope: string[]
  suggested_package: string | null
  confidence: number
  notes: string | null
}

// ── Store Actions ──

export interface WizardActions {
  // Navigation
  goToStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setEntryMode: (mode: WizardEntryMode) => void
  setUploadedLayout: (url: string | null) => void

  // Step 1
  updateProjectDetails: (partial: Partial<WizardProjectDetails>) => void

  // Step 2
  toggleRoom: (key: string, label: string) => void
  selectStandardRooms: () => void
  resetRooms: () => void
  updateRoomDimensions: (key: string, dims: Partial<WizardRoomDimensions>) => void
  addCustomRoom: (label: string) => void

  // Step 3
  toggleItem: (roomKey: string, itemKey: string) => void
  selectRecommendedItems: (roomKey: string) => void

  // Step 4
  setApplyToAll: (value: boolean) => void
  updateGlobalMaterial: (partial: Partial<WizardMaterialSelection>) => void
  updateRoomMaterial: (roomKey: string, partial: Partial<WizardMaterialSelection>) => void

  // Step 5
  toggleAddon: (addonKey: string) => void

  // Step 6
  setDiscount: (percent: string) => void

  // Room Builder
  updateRoomBuilder: (roomKey: string, config: RoomBuilderConfig) => void
  clearRoomBuilder: (roomKey: string) => void

  // Floor Plan AI
  applyFloorPlanAnalysis: (analysis: FloorPlanAnalysis) => void

  // Misc
  recalculateCosts: () => void
  resetWizard: () => void
}

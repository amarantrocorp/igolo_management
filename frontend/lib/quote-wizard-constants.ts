import type {
  RoomDefinition,
  MaterialCategory,
  AddonCategory,
  PackageDefinition,
  PropertyType,
  BudgetRange,
} from "@/types/quote-wizard"

// ============================================================
// Packages
// ============================================================

export const PACKAGES: PackageDefinition[] = [
  {
    key: "BASIC",
    label: "Basic",
    icon: "Layers",
    description: "Essential interiors",
    defaultWood: "COMMERCIAL_PLY",
    defaultFinish: "LAMINATE",
    defaultHardware: "BASIC",
    defaultCountertop: "GRANITE",
    priceMultiplier: 1.0,
  },
  {
    key: "STANDARD",
    label: "Standard",
    icon: "Star",
    description: "Balanced quality",
    defaultWood: "BWR_PLY",
    defaultFinish: "LAMINATE",
    defaultHardware: "HETTICH_STD",
    defaultCountertop: "GRANITE",
    priceMultiplier: 1.15,
  },
  {
    key: "PREMIUM",
    label: "Premium",
    icon: "Crown",
    description: "Premium finishes",
    defaultWood: "BWP_PLY",
    defaultFinish: "ACRYLIC",
    defaultHardware: "HETTICH_PREMIUM",
    defaultCountertop: "QUARTZ",
    priceMultiplier: 1.35,
  },
  {
    key: "LUXURY",
    label: "Luxury",
    icon: "Sparkles",
    description: "Top-tier design",
    defaultWood: "HDHMR",
    defaultFinish: "PU",
    defaultHardware: "BLUM",
    defaultCountertop: "CORIAN",
    priceMultiplier: 1.6,
  },
]

// ============================================================
// Material Categories
// ============================================================

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  {
    key: "wood",
    label: "Core Wood Material",
    description: "Base plywood for all carpentry work",
    defaultKey: "BWP_PLY",
    options: [
      { key: "COMMERCIAL_PLY", label: "Commercial Ply", priceMultiplier: 0.85 },
      { key: "BWR_PLY", label: "BWR Ply", priceMultiplier: 0.95 },
      { key: "BWP_PLY", label: "BWP Ply", priceMultiplier: 1.0 },
      { key: "HDHMR", label: "HDHMR", priceMultiplier: 1.1 },
    ],
  },
  {
    key: "finish",
    label: "Finish Type",
    description: "Surface finish — impacts price heavily",
    defaultKey: "LAMINATE",
    options: [
      { key: "LAMINATE", label: "Laminate", priceMultiplier: 1.0 },
      { key: "ACRYLIC", label: "Acrylic", priceMultiplier: 1.2 },
      { key: "PU", label: "PU", priceMultiplier: 1.25 },
      { key: "VENEER", label: "Veneer", priceMultiplier: 1.35 },
    ],
  },
  {
    key: "hardware",
    label: "Hardware Package",
    description: "Hinges, channels, handles",
    defaultKey: "HETTICH_STD",
    options: [
      { key: "BASIC", label: "Basic", priceMultiplier: 1.0 },
      { key: "HETTICH_STD", label: "Hettich Standard", priceMultiplier: 1.0 },
      { key: "HETTICH_PREMIUM", label: "Hettich Premium", priceMultiplier: 1.08 },
      { key: "BLUM", label: "Blum", priceMultiplier: 1.15 },
    ],
  },
  {
    key: "countertop",
    label: "Kitchen Countertop",
    description: "Kitchen slab material",
    defaultKey: "GRANITE",
    options: [
      { key: "GRANITE", label: "Granite", priceMultiplier: 1.0 },
      { key: "QUARTZ", label: "Quartz", priceMultiplier: 1.4 },
      { key: "SINTERED_STONE", label: "Sintered Stone", priceMultiplier: 1.6 },
      { key: "CORIAN", label: "Corian", priceMultiplier: 1.3 },
    ],
  },
]

// ============================================================
// Room Definitions with Items
// ============================================================

export const ROOM_DEFINITIONS: RoomDefinition[] = [
  {
    key: "LIVING_ROOM",
    label: "Living Room",
    icon: "Sofa",
    defaultForPropertyTypes: ["1BHK", "2BHK", "3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "tv_unit", label: "TV Unit", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "length" } },
      { key: "sofa_back_panel", label: "Sofa Back Panel", tier: "RECOMMENDED", unit: "sqft", baseRatePerUnit: 850, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "storage_display", label: "Storage / Display Unit", tier: "RECOMMENDED", unit: "sqft", baseRatePerUnit: 950, quantityFormula: { type: "fixed", value: 12 } },
      { key: "shoe_rack", label: "Shoe Rack", tier: "OPTIONAL", unit: "unit", baseRatePerUnit: 14000, quantityFormula: { type: "fixed", value: 1 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 75, quantityFormula: { type: "floor_area" } },
      { key: "accent_wall", label: "Accent / Panel Wall", tier: "PREMIUM", unit: "sqft", baseRatePerUnit: 280, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "cove_lighting", label: "Cove / Profile Lighting", tier: "PREMIUM", unit: "rft", baseRatePerUnit: 250, quantityFormula: { type: "perimeter" } },
    ],
  },
  {
    key: "DINING_AREA",
    label: "Dining Area",
    icon: "UtensilsCrossed",
    defaultForPropertyTypes: ["2BHK", "3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "crockery_unit", label: "Crockery Unit", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1400, quantityFormula: { type: "fixed", value: 5 } },
      { key: "bar_counter", label: "Bar Counter", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1800, quantityFormula: { type: "fixed", value: 4 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 75, quantityFormula: { type: "floor_area" } },
      { key: "wall_panel", label: "Wall Panelling", tier: "PREMIUM", unit: "sqft", baseRatePerUnit: 350, quantityFormula: { type: "wall_length", wallCount: 1 } },
    ],
  },
  {
    key: "KITCHEN",
    label: "Kitchen",
    icon: "ChefHat",
    defaultForPropertyTypes: ["1BHK", "2BHK", "3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "base_cabinet", label: "Base Cabinet", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1650, quantityFormula: { type: "perimeter" } },
      { key: "wall_cabinet", label: "Wall Cabinet", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "length" } },
      { key: "tall_unit", label: "Tall Unit", tier: "RECOMMENDED", unit: "unit", baseRatePerUnit: 25000, quantityFormula: { type: "fixed", value: 1 } },
      { key: "countertop", label: "Countertop", tier: "RECOMMENDED", unit: "sqft", baseRatePerUnit: 350, quantityFormula: { type: "length" } },
      { key: "backsplash", label: "Backsplash", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 180, quantityFormula: { type: "length" } },
      { key: "breakfast_counter", label: "Breakfast Counter", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1500, quantityFormula: { type: "fixed", value: 4 } },
      { key: "loft_storage", label: "Loft Storage", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 900, quantityFormula: { type: "length" } },
    ],
  },
  {
    key: "UTILITY",
    label: "Utility",
    icon: "Wrench",
    defaultForPropertyTypes: ["1BHK", "2BHK", "3BHK", "4BHK", "VILLA"],
    items: [
      { key: "utility_cabinet", label: "Utility Cabinet", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "length" } },
      { key: "wall_shelf", label: "Wall Shelf Unit", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 800, quantityFormula: { type: "fixed", value: 4 } },
      { key: "loft_storage", label: "Loft Storage", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 900, quantityFormula: { type: "length" } },
    ],
  },
  {
    key: "MASTER_BEDROOM",
    label: "Master Bedroom",
    icon: "BedDouble",
    defaultForPropertyTypes: ["1BHK", "2BHK", "3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "wardrobe", label: "Wardrobe", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1400, quantityFormula: { type: "width" } },
      { key: "bed_back_panel", label: "Bed Back Panel", tier: "RECOMMENDED", unit: "sqft", baseRatePerUnit: 650, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "dresser", label: "Dresser / Vanity", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "fixed", value: 4 } },
      { key: "side_tables", label: "Side Tables", tier: "OPTIONAL", unit: "unit", baseRatePerUnit: 5500, quantityFormula: { type: "fixed", value: 2 } },
      { key: "study_table", label: "Study Table", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1100, quantityFormula: { type: "fixed", value: 4 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 75, quantityFormula: { type: "floor_area" } },
      { key: "tv_unit", label: "TV Unit", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "fixed", value: 5 } },
      { key: "curtain_pelmet", label: "Curtain Pelmet", tier: "PREMIUM", unit: "rft", baseRatePerUnit: 350, quantityFormula: { type: "width" } },
    ],
  },
  {
    key: "GUEST_BEDROOM",
    label: "Guest Bedroom",
    icon: "BedSingle",
    defaultForPropertyTypes: ["2BHK", "3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "wardrobe", label: "Wardrobe", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1400, quantityFormula: { type: "width" } },
      { key: "bed_back_panel", label: "Bed Back Panel", tier: "RECOMMENDED", unit: "sqft", baseRatePerUnit: 650, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "study_table", label: "Study Table", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1100, quantityFormula: { type: "fixed", value: 4 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 75, quantityFormula: { type: "floor_area" } },
      { key: "tv_unit", label: "TV Unit", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "fixed", value: 5 } },
    ],
  },
  {
    key: "KIDS_BEDROOM",
    label: "Kids Bedroom",
    icon: "Star",
    defaultForPropertyTypes: ["3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "wardrobe", label: "Wardrobe", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1400, quantityFormula: { type: "width" } },
      { key: "study_table", label: "Study Table", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1100, quantityFormula: { type: "fixed", value: 5 } },
      { key: "bed_back_panel", label: "Bed Back Panel", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 650, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "bookshelf", label: "Bookshelf", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1000, quantityFormula: { type: "fixed", value: 4 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 75, quantityFormula: { type: "floor_area" } },
    ],
  },
  {
    key: "POOJA_ROOM",
    label: "Pooja Room",
    icon: "Flame",
    defaultForPropertyTypes: ["3BHK", "4BHK", "VILLA"],
    items: [
      { key: "pooja_unit", label: "Pooja Unit / Mandir", tier: "RECOMMENDED", unit: "unit", baseRatePerUnit: 35000, quantityFormula: { type: "fixed", value: 1 } },
      { key: "wall_panel", label: "Wall Panelling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 450, quantityFormula: { type: "wall_area" } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 85, quantityFormula: { type: "floor_area" } },
    ],
  },
  {
    key: "FOYER",
    label: "Foyer",
    icon: "DoorOpen",
    defaultForPropertyTypes: ["3BHK", "4BHK", "VILLA", "PENTHOUSE"],
    items: [
      { key: "shoe_rack", label: "Shoe Rack", tier: "RECOMMENDED", unit: "unit", baseRatePerUnit: 14000, quantityFormula: { type: "fixed", value: 1 } },
      { key: "console_table", label: "Console Table", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "fixed", value: 4 } },
      { key: "wall_panel", label: "Wall Panel / Mirror", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 380, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "PREMIUM", unit: "sqft", baseRatePerUnit: 85, quantityFormula: { type: "floor_area" } },
    ],
  },
  {
    key: "BALCONY",
    label: "Balcony",
    icon: "Home",
    defaultForPropertyTypes: [],
    items: [
      { key: "storage_unit", label: "Balcony Storage Unit", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1000, quantityFormula: { type: "fixed", value: 4 } },
      { key: "seating_ledge", label: "Seating Ledge", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 800, quantityFormula: { type: "length" } },
    ],
  },
  {
    key: "STUDY_ROOM",
    label: "Study Room",
    icon: "BookOpen",
    defaultForPropertyTypes: ["4BHK", "VILLA"],
    items: [
      { key: "study_table", label: "Study / Work Desk", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1300, quantityFormula: { type: "length" } },
      { key: "bookshelf", label: "Bookshelf", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1100, quantityFormula: { type: "width" } },
      { key: "storage_cabinet", label: "Storage Cabinet", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "fixed", value: 4 } },
      { key: "false_ceiling", label: "False Ceiling", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 75, quantityFormula: { type: "floor_area" } },
    ],
  },
  {
    key: "TV_UNIT_AREA",
    label: "TV Unit Area",
    icon: "Monitor",
    defaultForPropertyTypes: [],
    items: [
      { key: "tv_unit", label: "TV Unit", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "length" } },
      { key: "back_panel", label: "Back Panel", tier: "OPTIONAL", unit: "sqft", baseRatePerUnit: 650, quantityFormula: { type: "wall_length", wallCount: 1 } },
      { key: "storage_below", label: "Storage Below", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 950, quantityFormula: { type: "length" } },
    ],
  },
  {
    key: "BAR_UNIT",
    label: "Bar Unit",
    icon: "Wine",
    defaultForPropertyTypes: [],
    items: [
      { key: "bar_cabinet", label: "Bar Cabinet", tier: "RECOMMENDED", unit: "rft", baseRatePerUnit: 1800, quantityFormula: { type: "fixed", value: 4 } },
      { key: "bar_counter", label: "Bar Counter", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 2000, quantityFormula: { type: "fixed", value: 4 } },
      { key: "wall_shelf", label: "Wine Display Shelf", tier: "PREMIUM", unit: "rft", baseRatePerUnit: 1200, quantityFormula: { type: "fixed", value: 4 } },
    ],
  },
  {
    key: "SHOE_RACK_AREA",
    label: "Shoe Rack Area",
    icon: "Footprints",
    defaultForPropertyTypes: [],
    items: [
      { key: "shoe_rack", label: "Shoe Rack", tier: "RECOMMENDED", unit: "unit", baseRatePerUnit: 14000, quantityFormula: { type: "fixed", value: 1 } },
      { key: "bench", label: "Seating Bench", tier: "OPTIONAL", unit: "rft", baseRatePerUnit: 900, quantityFormula: { type: "fixed", value: 3 } },
    ],
  },
]

// ============================================================
// Property Type → Default Rooms Mapping
// ============================================================

export const PROPERTY_DEFAULT_ROOMS: Record<PropertyType, string[]> = {
  "1BHK": ["LIVING_ROOM", "KITCHEN", "MASTER_BEDROOM", "UTILITY"],
  "2BHK": ["LIVING_ROOM", "DINING_AREA", "KITCHEN", "MASTER_BEDROOM", "GUEST_BEDROOM", "UTILITY"],
  "3BHK": ["LIVING_ROOM", "DINING_AREA", "KITCHEN", "MASTER_BEDROOM", "GUEST_BEDROOM", "KIDS_BEDROOM", "UTILITY", "FOYER"],
  "4BHK": ["LIVING_ROOM", "DINING_AREA", "KITCHEN", "MASTER_BEDROOM", "GUEST_BEDROOM", "KIDS_BEDROOM", "STUDY_ROOM", "UTILITY", "FOYER", "POOJA_ROOM"],
  VILLA: ["LIVING_ROOM", "DINING_AREA", "KITCHEN", "MASTER_BEDROOM", "GUEST_BEDROOM", "KIDS_BEDROOM", "STUDY_ROOM", "UTILITY", "FOYER", "POOJA_ROOM", "BALCONY"],
  PENTHOUSE: ["LIVING_ROOM", "DINING_AREA", "KITCHEN", "MASTER_BEDROOM", "GUEST_BEDROOM", "KIDS_BEDROOM", "FOYER", "BAR_UNIT"],
  OFFICE: ["LIVING_ROOM", "KITCHEN", "STUDY_ROOM"],
  COMMERCIAL: ["LIVING_ROOM"],
}

// ============================================================
// Add-on Categories
// ============================================================

export const ADDON_CATEGORIES: AddonCategory[] = [
  {
    key: "civil_services",
    label: "Civil & Services",
    icon: "HardHat",
    items: [
      { key: "painting", label: "Painting", basePrice: 12000 },
      { key: "profile_lighting", label: "Profile Lighting", basePrice: 10000 },
    ],
  },
  {
    key: "furniture_decor",
    label: "Furniture & Decor",
    icon: "Armchair",
    items: [
      { key: "loose_furniture", label: "Loose Furniture", basePrice: 25000 },
      { key: "decor_items", label: "Decor Items", basePrice: 15000 },
      { key: "curtains", label: "Curtains", basePrice: 18000 },
    ],
  },
  {
    key: "utility_works",
    label: "Utility Works",
    icon: "Wrench",
    items: [
      { key: "electrical_work", label: "Electrical Work", basePrice: 20000 },
      { key: "plumbing_work", label: "Plumbing Work", basePrice: 15000 },
      { key: "civil_modifications", label: "Civil Modifications", basePrice: 30000 },
      { key: "deep_cleaning", label: "Deep Cleaning", basePrice: 5000 },
    ],
  },
  {
    key: "premium_addons",
    label: "Premium Add-ons",
    icon: "Gem",
    items: [
      { key: "glass_partitions", label: "Glass Partitions", basePrice: 25000 },
      { key: "smart_locks", label: "Smart Locks", basePrice: 8000 },
      { key: "appliance_integration", label: "Appliance Integration", basePrice: 12000 },
    ],
  },
]

// ============================================================
// Cities & Budget Ranges
// ============================================================

export const CITIES = [
  "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai",
  "Pune", "Kolkata", "Ahmedabad", "Noida", "Gurgaon",
  "Jaipur", "Lucknow", "Chandigarh", "Kochi", "Coimbatore",
  "Indore", "Nagpur", "Vadodara", "Visakhapatnam", "Mysore",
]

export const BUDGET_RANGES: BudgetRange[] = [
  "Under 5L", "5-10L", "10-15L", "15-25L", "25-50L", "50L+",
]

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "1BHK", label: "1 BHK" },
  { value: "2BHK", label: "2 BHK" },
  { value: "3BHK", label: "3 BHK" },
  { value: "4BHK", label: "4 BHK" },
  { value: "VILLA", label: "Villa" },
  { value: "PENTHOUSE", label: "Penthouse" },
  { value: "OFFICE", label: "Office" },
  { value: "COMMERCIAL", label: "Commercial" },
]

export const GST_RATE = 0.18

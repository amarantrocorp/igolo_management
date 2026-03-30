// ============================================================
// Room Builder — Category-based BOQ Catalogs per Room Type
// Industry-standard approach used by Livspace, HomeLane, etc.
// Room → Work Category → Items → Specs
// ============================================================

import type {
  RoomCatalog,
  CatalogItemDef,
  WorkCategory,
} from "@/types/quote-wizard"

// ── Work Category metadata ──

export const WORK_CATEGORIES: {
  key: WorkCategory
  label: string
  icon: string
}[] = [
  { key: "WOODWORK", label: "Woodwork & Carpentry", icon: "Hammer" },
  { key: "FALSE_CEILING", label: "False Ceiling", icon: "Layers" },
  { key: "ELECTRICAL", label: "Electrical & Lighting", icon: "Zap" },
  { key: "PAINTING", label: "Painting & Wall Treatment", icon: "Paintbrush" },
  { key: "FLOORING", label: "Flooring", icon: "Grid3x3" },
  { key: "COUNTERTOP_STONE", label: "Countertop & Stone", icon: "Gem" },
  { key: "FIXTURES_FITTINGS", label: "Fixtures & Fittings", icon: "Wrench" },
  { key: "SOFT_FURNISHING", label: "Soft Furnishing", icon: "Armchair" },
  { key: "MISCELLANEOUS", label: "Miscellaneous", icon: "Package" },
]

// ── Placement options ──

export const PLACEMENT_OPTIONS = [
  { value: "none", label: "Not specified" },
  { value: "wall_a", label: "Wall A (Entry)" },
  { value: "wall_b", label: "Wall B (Right)" },
  { value: "wall_c", label: "Wall C (Opposite)" },
  { value: "wall_d", label: "Wall D (Left)" },
  { value: "island", label: "Island / Freestanding" },
  { value: "center", label: "Center of Room" },
  { value: "corner", label: "Corner" },
  { value: "window_side", label: "Window Side" },
  { value: "ceiling", label: "Ceiling" },
  { value: "floor", label: "Floor" },
  { value: "full_room", label: "Full Room" },
] as const

// ── Kitchen Catalog ──

const KITCHEN: CatalogItemDef[] = [
  {
    key: "k_upper_cabinets", name: "Upper Cabinets", category: "WOODWORK",
    defaultLength: 8, defaultWidth: 1, defaultHeight: 2.5, defaultUnit: "sqft",
    defaultMaterial: "BWR Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Shelves", defaultQty: 3 },
      { name: "Soft-close Hinges", defaultQty: 4 },
      { name: "Glass Shutter", defaultQty: 0 },
      { name: "Profile Handle", defaultQty: 4 },
    ],
  },
  {
    key: "k_lower_cabinets", name: "Lower Cabinets", category: "WOODWORK",
    defaultLength: 8, defaultWidth: 2, defaultHeight: 3, defaultUnit: "sqft",
    defaultMaterial: "BWR Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Drawers", defaultQty: 3 },
      { name: "Tandem Box", defaultQty: 1 },
      { name: "Dustbin Pullout", defaultQty: 1 },
      { name: "Corner Carousel", defaultQty: 0 },
      { name: "Cutlery Tray", defaultQty: 1 },
    ],
  },
  {
    key: "k_tall_unit", name: "Tall Unit", category: "WOODWORK",
    defaultLength: 2, defaultWidth: 2, defaultHeight: 7, defaultUnit: "sqft",
    defaultMaterial: "BWR Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Shelves", defaultQty: 5 },
      { name: "Pullout Trays", defaultQty: 2 },
    ],
  },
  {
    key: "k_loft", name: "Loft Storage", category: "WOODWORK",
    defaultLength: 8, defaultWidth: 1, defaultHeight: 1.5, defaultUnit: "sqft",
    defaultMaterial: "Commercial Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 1 }],
  },
  {
    key: "k_countertop", name: "Countertop", category: "COUNTERTOP_STONE",
    defaultLength: 8, defaultWidth: 2, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Quartz", defaultFinish: "Polished",
    subItems: [
      { name: "Edge Profile (Bullnose/Beveled/Waterfall)", defaultQty: 1 },
    ],
  },
  {
    key: "k_backsplash", name: "Backsplash", category: "COUNTERTOP_STONE",
    defaultLength: 8, defaultWidth: 0, defaultHeight: 2, defaultUnit: "sqft",
    defaultMaterial: "Ceramic Tile", defaultFinish: "Glossy",
    subItems: [],
  },
  {
    key: "k_sink", name: "Sink & Faucet", category: "FIXTURES_FITTINGS",
    defaultLength: 2, defaultWidth: 1.5, defaultHeight: 0, defaultUnit: "nos",
    defaultMaterial: "Stainless Steel", defaultFinish: "",
    subItems: [
      { name: "Type (Single/Double)", defaultQty: 1 },
      { name: "Faucet (Pull-out/Fixed)", defaultQty: 1 },
    ],
  },
  {
    key: "k_chimney", name: "Chimney", category: "FIXTURES_FITTINGS",
    defaultLength: 2, defaultWidth: 1.5, defaultHeight: 2, defaultUnit: "nos",
    defaultMaterial: "", defaultFinish: "",
    subItems: [{ name: "Type (Wall-mounted/Island/Built-in)", defaultQty: 1 }],
  },
  {
    key: "k_false_ceiling", name: "False Ceiling", category: "FALSE_CEILING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Gypsum", defaultFinish: "POP Finish",
    subItems: [
      { name: "Cove Light (rft)", defaultQty: 12 },
      { name: "Spot Lights", defaultQty: 4 },
    ],
  },
  {
    key: "k_painting", name: "Wall Painting", category: "PAINTING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Emulsion", defaultFinish: "Matt",
    subItems: [
      { name: "Brand (Asian/Berger/Dulux)", defaultQty: 1 },
      { name: "Coats", defaultQty: 2 },
    ],
  },
]

// ── Bedroom Catalog (shared for Master, Guest) ──

const BEDROOM: CatalogItemDef[] = [
  {
    key: "b_wardrobe", name: "Wardrobe", category: "WOODWORK",
    defaultLength: 7, defaultWidth: 2, defaultHeight: 7, defaultUnit: "sqft",
    defaultMaterial: "BWR Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Drawers", defaultQty: 4 },
      { name: "Hanging Rods", defaultQty: 2 },
      { name: "Shelves", defaultQty: 6 },
      { name: "Mirror", defaultQty: 1 },
      { name: "Safe Section", defaultQty: 0 },
      { name: "Trouser Pullout", defaultQty: 0 },
      { name: "Tie/Belt Rack", defaultQty: 0 },
      { name: "Soft-close Hinges", defaultQty: 4 },
    ],
  },
  {
    key: "b_loft", name: "Loft", category: "WOODWORK",
    defaultLength: 7, defaultWidth: 2, defaultHeight: 1.5, defaultUnit: "sqft",
    defaultMaterial: "Commercial Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 1 }],
  },
  {
    key: "b_bed_back", name: "Bed Back Panel", category: "WOODWORK",
    defaultLength: 7, defaultWidth: 0.5, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "MDF", defaultFinish: "PU/Fabric",
    subItems: [
      { name: "Type (Cushioned/Wooden/Fluted)", defaultQty: 1 },
      { name: "LED Strip", defaultQty: 0 },
    ],
  },
  {
    key: "b_side_tables", name: "Side Tables", category: "WOODWORK",
    defaultLength: 1.5, defaultWidth: 1.5, defaultHeight: 2, defaultUnit: "nos",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Count", defaultQty: 2 },
      { name: "Drawers per Table", defaultQty: 1 },
    ],
  },
  {
    key: "b_dresser", name: "Dresser / Vanity", category: "WOODWORK",
    defaultLength: 3, defaultWidth: 1.5, defaultHeight: 5, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Mirror", defaultQty: 1 },
      { name: "Drawers", defaultQty: 3 },
      { name: "LED Mirror Light", defaultQty: 0 },
    ],
  },
  {
    key: "b_tv_unit", name: "TV Unit", category: "WOODWORK",
    defaultLength: 5, defaultWidth: 1.5, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Shelves", defaultQty: 2 },
      { name: "Cable Box", defaultQty: 1 },
      { name: "LED Backlight", defaultQty: 0 },
    ],
  },
  {
    key: "b_study", name: "Study Table", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 2, defaultHeight: 2.5, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Drawers", defaultQty: 2 },
      { name: "Keyboard Tray", defaultQty: 0 },
      { name: "Book Shelf Above", defaultQty: 0 },
    ],
  },
  {
    key: "b_curtain_pelmet", name: "Curtain Pelmet", category: "WOODWORK",
    defaultLength: 6, defaultWidth: 0.5, defaultHeight: 0.5, defaultUnit: "rft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Type (Box/L-shape)", defaultQty: 1 }],
  },
  {
    key: "b_false_ceiling", name: "False Ceiling", category: "FALSE_CEILING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Gypsum", defaultFinish: "POP Finish",
    subItems: [
      { name: "Type (Peripheral/Full/L-shape)", defaultQty: 1 },
      { name: "Cove Light (rft)", defaultQty: 10 },
      { name: "Spot Lights", defaultQty: 4 },
    ],
  },
  {
    key: "b_wall_paneling", name: "Wall Paneling / Accent Wall", category: "PAINTING",
    defaultLength: 8, defaultWidth: 0.5, defaultHeight: 8, defaultUnit: "sqft",
    defaultMaterial: "WPC/PVC", defaultFinish: "Fluted",
    subItems: [{ name: "Pattern (Fluted/Flat/3D)", defaultQty: 1 }],
  },
  {
    key: "b_painting", name: "Wall Painting", category: "PAINTING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Emulsion", defaultFinish: "Matt",
    subItems: [
      { name: "Brand", defaultQty: 1 },
      { name: "Coats", defaultQty: 2 },
    ],
  },
  {
    key: "b_flooring", name: "Flooring", category: "FLOORING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Vitrified Tile", defaultFinish: "Matt",
    subItems: [
      { name: "Size (2×2 / 2×4 / 4×4)", defaultQty: 1 },
      { name: "Skirting (rft)", defaultQty: 0 },
    ],
  },
]

// ── Kids Bedroom extras ──

const KIDS_EXTRAS: CatalogItemDef[] = [
  {
    key: "kb_bunk", name: "Bunk Bed Unit", category: "WOODWORK",
    defaultLength: 6, defaultWidth: 3, defaultHeight: 6, defaultUnit: "nos",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Guard Rail", defaultQty: 1 },
      { name: "Steps/Ladder", defaultQty: 1 },
      { name: "Storage Below", defaultQty: 1 },
    ],
  },
  {
    key: "kb_bookshelf", name: "Bookshelf / Display", category: "WOODWORK",
    defaultLength: 3, defaultWidth: 1, defaultHeight: 5, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Open Shelves", defaultQty: 5 },
      { name: "Closed Cabinets", defaultQty: 2 },
    ],
  },
]

// ── Living Room ──

const LIVING_ROOM: CatalogItemDef[] = [
  {
    key: "lr_tv_unit", name: "TV Unit / Entertainment Wall", category: "WOODWORK",
    defaultLength: 7, defaultWidth: 1.5, defaultHeight: 5, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate/Veneer",
    subItems: [
      { name: "Open Shelves", defaultQty: 3 },
      { name: "Display Niche", defaultQty: 2 },
      { name: "LED Backlight", defaultQty: 1 },
      { name: "Closed Cabinets", defaultQty: 2 },
      { name: "Cable Management", defaultQty: 1 },
    ],
  },
  {
    key: "lr_shoe_rack", name: "Shoe Rack", category: "WOODWORK",
    defaultLength: 3, defaultWidth: 1, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Type (Pull-down/Open)", defaultQty: 1 },
      { name: "Pair Capacity", defaultQty: 20 },
    ],
  },
  {
    key: "lr_display", name: "Display / Showcase Unit", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1.5, defaultHeight: 6, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Glass Shelves", defaultQty: 3 },
      { name: "LED Spot Inside", defaultQty: 2 },
      { name: "Drawers Below", defaultQty: 2 },
    ],
  },
  {
    key: "lr_crockery", name: "Crockery Unit", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1.5, defaultHeight: 6, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Glass Doors", defaultQty: 2 },
      { name: "Drawers", defaultQty: 3 },
      { name: "Wine Rack", defaultQty: 0 },
    ],
  },
  {
    key: "lr_mandir", name: "Mandir / Pooja Unit", category: "WOODWORK",
    defaultLength: 2, defaultWidth: 1, defaultHeight: 4, defaultUnit: "nos",
    defaultMaterial: "Solid Wood/Ply", defaultFinish: "PU/Laminate",
    subItems: [
      { name: "Drawer", defaultQty: 1 },
      { name: "Bell Hook", defaultQty: 1 },
      { name: "LED Backlight", defaultQty: 1 },
      { name: "CNC Jali Door", defaultQty: 0 },
    ],
  },
  {
    key: "lr_wall_panel", name: "Wall Paneling", category: "PAINTING",
    defaultLength: 8, defaultWidth: 0.5, defaultHeight: 8, defaultUnit: "sqft",
    defaultMaterial: "WPC/PVC", defaultFinish: "Fluted",
    subItems: [{ name: "Pattern", defaultQty: 1 }],
  },
  {
    key: "lr_false_ceiling", name: "False Ceiling", category: "FALSE_CEILING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Gypsum", defaultFinish: "POP",
    subItems: [
      { name: "Type (Peripheral/Full/Designer)", defaultQty: 1 },
      { name: "Cove Light (rft)", defaultQty: 16 },
      { name: "Chandelier Point", defaultQty: 0 },
      { name: "Spot Lights", defaultQty: 6 },
    ],
  },
  {
    key: "lr_painting", name: "Wall Painting", category: "PAINTING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Emulsion", defaultFinish: "Matt",
    subItems: [{ name: "Brand", defaultQty: 1 }, { name: "Coats", defaultQty: 2 }],
  },
  {
    key: "lr_flooring", name: "Flooring", category: "FLOORING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Vitrified Tile", defaultFinish: "Glossy",
    subItems: [{ name: "Size", defaultQty: 1 }, { name: "Skirting (rft)", defaultQty: 0 }],
  },
]

// ── Dining ──

const DINING: CatalogItemDef[] = [
  {
    key: "d_crockery", name: "Crockery / Bar Unit", category: "WOODWORK",
    defaultLength: 5, defaultWidth: 1.5, defaultHeight: 6, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Glass Doors", defaultQty: 2 },
      { name: "Drawers", defaultQty: 3 },
      { name: "Wine Rack", defaultQty: 0 },
      { name: "LED Inside", defaultQty: 1 },
    ],
  },
  {
    key: "d_wall_panel", name: "Wall Paneling", category: "PAINTING",
    defaultLength: 6, defaultWidth: 0.5, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "WPC", defaultFinish: "Fluted",
    subItems: [],
  },
  {
    key: "d_false_ceiling", name: "False Ceiling", category: "FALSE_CEILING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Gypsum", defaultFinish: "POP",
    subItems: [
      { name: "Chandelier Point", defaultQty: 1 },
      { name: "Cove Light", defaultQty: 1 },
    ],
  },
]

// ── Study ──

const STUDY: CatalogItemDef[] = [
  {
    key: "s_desk", name: "Work Station / Study Desk", category: "WOODWORK",
    defaultLength: 5, defaultWidth: 2, defaultHeight: 2.5, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Drawers", defaultQty: 3 },
      { name: "Keyboard Tray", defaultQty: 1 },
      { name: "Cable Grommet", defaultQty: 2 },
    ],
  },
  {
    key: "s_bookshelf", name: "Bookshelf", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1, defaultHeight: 7, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [
      { name: "Open Shelves", defaultQty: 6 },
      { name: "Closed Cabinets", defaultQty: 2 },
    ],
  },
]

// ── Foyer ──

const FOYER: CatalogItemDef[] = [
  {
    key: "f_shoe_rack", name: "Shoe Rack", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Type (Pull-down/Open)", defaultQty: 1 }, { name: "Pair Capacity", defaultQty: 30 }],
  },
  {
    key: "f_console", name: "Console Table", category: "WOODWORK",
    defaultLength: 3, defaultWidth: 1, defaultHeight: 2.5, defaultUnit: "nos",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Drawer", defaultQty: 1 }, { name: "Mirror Above", defaultQty: 1 }],
  },
  {
    key: "f_wall_panel", name: "Wall Paneling", category: "PAINTING",
    defaultLength: 6, defaultWidth: 0.5, defaultHeight: 8, defaultUnit: "sqft",
    defaultMaterial: "WPC", defaultFinish: "Fluted",
    subItems: [],
  },
  {
    key: "f_false_ceiling", name: "False Ceiling", category: "FALSE_CEILING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Gypsum", defaultFinish: "POP",
    subItems: [{ name: "Cove Light", defaultQty: 1 }, { name: "Spot Lights", defaultQty: 4 }],
  },
]

// ── Pooja Room ──

const POOJA: CatalogItemDef[] = [
  {
    key: "p_mandir", name: "Mandir Unit", category: "WOODWORK",
    defaultLength: 3, defaultWidth: 1.5, defaultHeight: 5, defaultUnit: "nos",
    defaultMaterial: "Solid Wood/Ply", defaultFinish: "PU/Laminate",
    subItems: [
      { name: "Drawer", defaultQty: 1 },
      { name: "Bell Hook", defaultQty: 1 },
      { name: "LED Backlight", defaultQty: 1 },
      { name: "CNC Jali Door", defaultQty: 0 },
    ],
  },
  {
    key: "p_storage", name: "Storage Cabinets", category: "WOODWORK",
    defaultLength: 2, defaultWidth: 1, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 3 }],
  },
]

// ── Utility ──

const UTILITY: CatalogItemDef[] = [
  {
    key: "u_cabinets", name: "Utility Cabinets", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 2, defaultHeight: 7, defaultUnit: "sqft",
    defaultMaterial: "BWR Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 4 }, { name: "Broom Holder", defaultQty: 1 }],
  },
  {
    key: "u_washer_unit", name: "Washing Machine Unit", category: "WOODWORK",
    defaultLength: 2.5, defaultWidth: 2.5, defaultHeight: 3, defaultUnit: "nos",
    defaultMaterial: "BWR Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Counter on Top", defaultQty: 1 }],
  },
  {
    key: "u_loft", name: "Loft", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 2, defaultHeight: 1.5, defaultUnit: "sqft",
    defaultMaterial: "Commercial Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 1 }],
  },
]

// ── Balcony ──

const BALCONY: CatalogItemDef[] = [
  {
    key: "bal_storage", name: "Storage Cabinet", category: "WOODWORK",
    defaultLength: 3, defaultWidth: 1.5, defaultHeight: 4, defaultUnit: "sqft",
    defaultMaterial: "BWP Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 3 }],
  },
  {
    key: "bal_seating", name: "Built-in Seating", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 2, defaultHeight: 1.5, defaultUnit: "nos",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Storage Below", defaultQty: 1 }, { name: "Cushion", defaultQty: 1 }],
  },
]

// ── Bar Unit ──

const BAR: CatalogItemDef[] = [
  {
    key: "bar_counter", name: "Bar Counter", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1.5, defaultHeight: 3.5, defaultUnit: "nos",
    defaultMaterial: "Ply", defaultFinish: "Veneer/PU",
    subItems: [
      { name: "Seating Count", defaultQty: 3 },
      { name: "Glass Rack", defaultQty: 1 },
      { name: "Wine Rack", defaultQty: 1 },
      { name: "LED Backlight", defaultQty: 1 },
    ],
  },
  {
    key: "bar_wall_unit", name: "Bar Wall Unit", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1, defaultHeight: 5, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Veneer",
    subItems: [
      { name: "Glass Shelves", defaultQty: 3 },
      { name: "Mirror Back", defaultQty: 1 },
      { name: "LED Inside", defaultQty: 1 },
    ],
  },
]

// ── Generic (for custom/unknown rooms) ──

const GENERIC: CatalogItemDef[] = [
  {
    key: "gen_storage", name: "Storage Unit", category: "WOODWORK",
    defaultLength: 4, defaultWidth: 1.5, defaultHeight: 6, defaultUnit: "sqft",
    defaultMaterial: "Ply", defaultFinish: "Laminate",
    subItems: [{ name: "Shelves", defaultQty: 4 }, { name: "Drawers", defaultQty: 2 }],
  },
  {
    key: "gen_fc", name: "False Ceiling", category: "FALSE_CEILING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Gypsum", defaultFinish: "POP",
    subItems: [{ name: "Cove Light", defaultQty: 1 }, { name: "Spot Lights", defaultQty: 4 }],
  },
  {
    key: "gen_painting", name: "Wall Painting", category: "PAINTING",
    defaultLength: 0, defaultWidth: 0, defaultHeight: 0, defaultUnit: "sqft",
    defaultMaterial: "Emulsion", defaultFinish: "Matt",
    subItems: [{ name: "Brand", defaultQty: 1 }, { name: "Coats", defaultQty: 2 }],
  },
]

// ── Master catalog map ──

const ROOM_CATALOGS: RoomCatalog[] = [
  { roomKeys: ["KITCHEN"], items: KITCHEN },
  { roomKeys: ["MASTER_BEDROOM", "GUEST_BEDROOM"], items: BEDROOM },
  { roomKeys: ["KIDS_BEDROOM"], items: [...BEDROOM, ...KIDS_EXTRAS] },
  { roomKeys: ["LIVING_ROOM", "TV_UNIT_AREA"], items: LIVING_ROOM },
  { roomKeys: ["DINING_AREA"], items: DINING },
  { roomKeys: ["STUDY_ROOM"], items: STUDY },
  { roomKeys: ["FOYER", "SHOE_RACK_AREA"], items: FOYER },
  { roomKeys: ["POOJA_ROOM"], items: POOJA },
  { roomKeys: ["UTILITY"], items: UTILITY },
  { roomKeys: ["BALCONY"], items: BALCONY },
  { roomKeys: ["BAR_UNIT"], items: BAR },
]

/**
 * Get the catalog for a room type. Falls back to generic for unknown rooms.
 */
export function getCatalogForRoom(roomKey: string): CatalogItemDef[] {
  const catalog = ROOM_CATALOGS.find((c) => c.roomKeys.includes(roomKey))
  return catalog?.items ?? GENERIC
}

export { ROOM_CATALOGS }

import { create } from "zustand"
import type {
  WizardState,
  WizardActions,
  WizardEntryMode,
  WizardProjectDetails,
  WizardRoomDimensions,
  WizardMaterialSelection,
  WizardSelectedRoom,
  PropertyType,
  FloorPlanAnalysis,
} from "@/types/quote-wizard"
import {
  ROOM_DEFINITIONS,
  PACKAGES,
  PROPERTY_DEFAULT_ROOMS,
} from "@/lib/quote-wizard-constants"
import { calcCostBreakdown } from "@/lib/quote-wizard-calc"

const DEFAULT_MATERIALS: WizardMaterialSelection = {
  wood: "BWP_PLY",
  finish: "LAMINATE",
  hardware: "HETTICH_STD",
  countertop: "GRANITE",
}

const DEFAULT_DIMS: WizardRoomDimensions = {
  length: "0",
  breadth: "0",
  height: "9",
}

function emptyState(): WizardState {
  return {
    currentStep: 0,
    entryMode: null,
    uploadedLayoutUrl: null,
    projectDetails: {
      leadId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      projectName: "",
      city: "Bangalore",
      propertyType: "",
      flatSizeSqft: "",
      budgetRange: "",
      packageType: "",
    },
    rooms: [],
    materials: {
      applyToAll: true,
      global: { ...DEFAULT_MATERIALS },
      perRoom: {},
    },
    selectedAddons: [],
    discount: { flatPercent: "" },
    costBreakdown: {
      baseCost: 0,
      materialUpgrade: 0,
      hardwareUpgrade: 0,
      addonsCost: 0,
      subtotal: 0,
      discountAmount: 0,
      gst: 0,
      finalAmount: 0,
    },
  }
}

export const useQuoteWizardStore = create<WizardState & WizardActions>(
  (set, get) => ({
    ...emptyState(),

    // ── Navigation ──

    goToStep: (step) => set({ currentStep: step }),

    nextStep: () => {
      const s = get()
      set({ currentStep: Math.min(s.currentStep + 1, 7) })
    },

    prevStep: () => {
      const s = get()
      set({ currentStep: Math.max(s.currentStep - 1, 0) })
    },

    setEntryMode: (mode: WizardEntryMode) =>
      set({ entryMode: mode, currentStep: 1 }),

    setUploadedLayout: (url) => set({ uploadedLayoutUrl: url }),

    // ── Step 1: Project Details ──

    updateProjectDetails: (partial) => {
      set((s) => {
        const updated = { ...s.projectDetails, ...partial }

        // When package changes, update default materials
        if (partial.packageType && partial.packageType !== s.projectDetails.packageType) {
          const pkg = PACKAGES.find((p) => p.key === partial.packageType)
          if (pkg) {
            return {
              projectDetails: updated,
              materials: {
                ...s.materials,
                global: {
                  wood: pkg.defaultWood,
                  finish: pkg.defaultFinish,
                  hardware: pkg.defaultHardware,
                  countertop: pkg.defaultCountertop,
                },
              },
            }
          }
        }

        return { projectDetails: updated }
      })
      get().recalculateCosts()
    },

    // ── Step 2: Rooms ──

    toggleRoom: (key, label) => {
      set((s) => {
        const exists = s.rooms.find((r) => r.key === key)
        if (exists) {
          return { rooms: s.rooms.filter((r) => r.key !== key) }
        }

        // Auto-select recommended items for new room
        const roomDef = ROOM_DEFINITIONS.find((r) => r.key === key)
        const recommendedItems = roomDef?.items
          .filter((i) => i.tier === "RECOMMENDED")
          .map((i) => i.key) ?? []

        const newRoom: WizardSelectedRoom = {
          key,
          label,
          dimensions: { ...DEFAULT_DIMS },
          selectedItemKeys: recommendedItems,
        }
        return { rooms: [...s.rooms, newRoom] }
      })
      get().recalculateCosts()
    },

    selectStandardRooms: () => {
      set((s) => {
        const propType = s.projectDetails.propertyType as PropertyType
        if (!propType) return s

        const defaultKeys = PROPERTY_DEFAULT_ROOMS[propType] ?? []
        const existingKeys = new Set(s.rooms.map((r) => r.key))

        const newRooms: WizardSelectedRoom[] = [...s.rooms]
        for (const key of defaultKeys) {
          if (existingKeys.has(key)) continue
          const roomDef = ROOM_DEFINITIONS.find((r) => r.key === key)
          if (!roomDef) continue

          const recommendedItems = roomDef.items
            .filter((i) => i.tier === "RECOMMENDED")
            .map((i) => i.key)

          newRooms.push({
            key,
            label: roomDef.label,
            dimensions: { ...DEFAULT_DIMS },
            selectedItemKeys: recommendedItems,
          })
        }
        return { rooms: newRooms }
      })
      get().recalculateCosts()
    },

    resetRooms: () => {
      set({ rooms: [] })
      get().recalculateCosts()
    },

    updateRoomDimensions: (key, dims) => {
      set((s) => ({
        rooms: s.rooms.map((r) =>
          r.key === key ? { ...r, dimensions: { ...r.dimensions, ...dims } } : r
        ),
      }))
      get().recalculateCosts()
    },

    addCustomRoom: (label) => {
      const key = `CUSTOM_${Date.now()}`
      set((s) => ({
        rooms: [
          ...s.rooms,
          {
            key,
            label,
            dimensions: { ...DEFAULT_DIMS },
            selectedItemKeys: [],
            isCustom: true,
          },
        ],
      }))
    },

    // ── Step 3: Items ──

    toggleItem: (roomKey, itemKey) => {
      set((s) => ({
        rooms: s.rooms.map((r) => {
          if (r.key !== roomKey) return r
          const has = r.selectedItemKeys.includes(itemKey)
          return {
            ...r,
            selectedItemKeys: has
              ? r.selectedItemKeys.filter((k) => k !== itemKey)
              : [...r.selectedItemKeys, itemKey],
          }
        }),
      }))
      get().recalculateCosts()
    },

    selectRecommendedItems: (roomKey) => {
      set((s) => ({
        rooms: s.rooms.map((r) => {
          if (r.key !== roomKey) return r
          const roomDef = ROOM_DEFINITIONS.find((rd) => rd.key === roomKey)
          if (!roomDef) return r
          const recommended = roomDef.items
            .filter((i) => i.tier === "RECOMMENDED")
            .map((i) => i.key)
          return { ...r, selectedItemKeys: recommended }
        }),
      }))
      get().recalculateCosts()
    },

    // ── Step 4: Materials ──

    setApplyToAll: (value) => {
      set((s) => ({ materials: { ...s.materials, applyToAll: value } }))
      get().recalculateCosts()
    },

    updateGlobalMaterial: (partial) => {
      set((s) => ({
        materials: {
          ...s.materials,
          global: { ...s.materials.global, ...partial },
        },
      }))
      get().recalculateCosts()
    },

    updateRoomMaterial: (roomKey, partial) => {
      set((s) => ({
        materials: {
          ...s.materials,
          perRoom: {
            ...s.materials.perRoom,
            [roomKey]: {
              ...(s.materials.perRoom[roomKey] ?? s.materials.global),
              ...partial,
            },
          },
        },
      }))
      get().recalculateCosts()
    },

    // ── Step 5: Add-ons ──

    toggleAddon: (addonKey) => {
      set((s) => ({
        selectedAddons: s.selectedAddons.includes(addonKey)
          ? s.selectedAddons.filter((k) => k !== addonKey)
          : [...s.selectedAddons, addonKey],
      }))
      get().recalculateCosts()
    },

    // ── Step 6: Discount ──

    setDiscount: (percent) => {
      set({ discount: { flatPercent: percent } })
      get().recalculateCosts()
    },

    // ── Cost Recalculation ──

    recalculateCosts: () => {
      const s = get()
      const breakdown = calcCostBreakdown(s)
      set({ costBreakdown: breakdown })
    },

    // ── Floor Plan AI ──

    applyFloorPlanAnalysis: (analysis: FloorPlanAnalysis) => {
      // Map bhk_config to PropertyType ("3 BHK" → "3BHK")
      let propertyType: PropertyType | "" = ""
      if (analysis.bhk_config) {
        const cleaned = analysis.bhk_config.replace(/\s+/g, "") as PropertyType
        if (["1BHK", "2BHK", "3BHK", "4BHK"].includes(cleaned)) {
          propertyType = cleaned
        }
      }
      if (!propertyType && analysis.property_type) {
        const pt = analysis.property_type.toUpperCase()
        if (["VILLA", "PENTHOUSE", "OFFICE", "COMMERCIAL"].includes(pt)) {
          propertyType = pt as PropertyType
        }
      }

      // Map suggested_package
      const validPackages = ["BASIC", "STANDARD", "PREMIUM", "LUXURY"]
      const packageType = analysis.suggested_package && validPackages.includes(analysis.suggested_package)
        ? analysis.suggested_package as "BASIC" | "STANDARD" | "PREMIUM" | "LUXURY"
        : ""

      // Update project details
      set((s) => ({
        projectDetails: {
          ...s.projectDetails,
          propertyType,
          flatSizeSqft: analysis.total_carpet_area_sqft ? String(Math.round(analysis.total_carpet_area_sqft)) : s.projectDetails.flatSizeSqft,
          packageType,
        },
      }))

      // Build rooms from analysis
      const newRooms: WizardSelectedRoom[] = []
      for (const detected of analysis.rooms) {
        const roomDef = detected.matched_key
          ? ROOM_DEFINITIONS.find((r) => r.key === detected.matched_key)
          : null

        const key = roomDef ? roomDef.key : `CUSTOM_${detected.name.toUpperCase().replace(/\s+/g, "_")}`
        const label = roomDef ? roomDef.label : detected.name

        // Filter suggested items to only valid ones for this room
        let selectedItemKeys: string[] = []
        if (roomDef && detected.suggested_items.length > 0) {
          const validItemKeys = new Set(roomDef.items.map((i) => i.key))
          selectedItemKeys = detected.suggested_items.filter((k) => validItemKeys.has(k))
        } else if (roomDef) {
          // Default to recommended items if no suggestions
          selectedItemKeys = roomDef.items
            .filter((i) => i.tier === "RECOMMENDED")
            .map((i) => i.key)
        }

        newRooms.push({
          key,
          label,
          dimensions: {
            length: detected.length_ft ? String(detected.length_ft) : "0",
            breadth: detected.breadth_ft ? String(detected.breadth_ft) : "0",
            height: detected.height_ft ? String(detected.height_ft) : "9",
          },
          selectedItemKeys,
          isCustom: !roomDef,
        })
      }

      set({ rooms: newRooms })

      // Recalculate costs
      get().recalculateCosts()
    },

    // ── Reset ──

    resetWizard: () => set(emptyState()),
  })
)

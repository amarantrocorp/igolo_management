"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Save,
  Send,
  Plus,
  Image as ImageIcon,
  Palette,
  Layers,
  MessageSquare,
  User,
  MapPin,
  Home,
  X,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// ── Constants ──

const DESIGN_STYLES = [
  "Modern",
  "Minimal",
  "Luxury",
  "Contemporary",
  "Traditional",
  "Scandinavian",
]

const WARDROBE_FINISHES = [
  "Laminate",
  "Veneer",
  "Acrylic",
  "PU",
  "Glass",
]

const KITCHEN_FINISHES = [
  "Laminate",
  "Veneer",
  "Acrylic",
  "PU",
  "Glass",
]

const WALL_PANEL_OPTIONS = [
  "Laminate",
  "Veneer",
  "Acrylic",
  "PU",
  "Glass",
  "Fluted Panel",
  "Fabric Padding",
]

const MOODBOARD_TABS = [
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Wardrobe",
  "Lighting",
  "Decor",
]

// ── Chip Select Component ──

function ChipSelect({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: string[]
  selected: string | string[]
  onSelect: (value: string) => void
  multi?: boolean
}) {
  const isSelected = (opt: string) =>
    multi
      ? (selected as string[]).includes(opt)
      : selected === opt

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            isSelected(opt)
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Color Input with Preview ──

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex-1 min-w-[180px]">
      <Label className="text-sm text-gray-600 mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border border-gray-200 shrink-0"
          style={{ backgroundColor: value || "#e5e7eb" }}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. #2D2D2D or Charcoal Gray"
          className="flex-1"
        />
      </div>
    </div>
  )
}

// ── Sample moodboard images ──

interface MoodboardImage {
  id: string
  url: string
  name: string
}

const EMPTY_MOODBOARD: Record<string, MoodboardImage[]> = {
  "Living Room": [],
  Kitchen: [],
  Bedroom: [],
  Wardrobe: [],
  Lighting: [],
  Decor: [],
}

// ── Main Page ──

export default function DesignConceptsPage() {
  const router = useRouter()

  // Project Info
  const [projectInfo, setProjectInfo] = useState({
    clientName: "",
    location: "",
    propertyType: "",
    designer: "",
  })

  // Aesthetic Direction
  const [designStyle, setDesignStyle] = useState("")
  const [primaryColor, setPrimaryColor] = useState("")
  const [secondaryColor, setSecondaryColor] = useState("")
  const [accentColor, setAccentColor] = useState("")

  // Material Selection
  const [wardrobeFinish, setWardrobeFinish] = useState("")
  const [kitchenFinish, setKitchenFinish] = useState("")
  const [wallPanels, setWallPanels] = useState<string[]>([])
  const [flooringType, setFlooringType] = useState("")
  const [countertopMaterial, setCountertopMaterial] = useState("")

  // Client Feedback
  const [comments, setComments] = useState("")
  const [revisionNotes, setRevisionNotes] = useState("")

  // Moodboard
  const [activeTab, setActiveTab] = useState("Living Room")
  const [moodboardImages, setMoodboardImages] =
    useState<Record<string, MoodboardImage[]>>(EMPTY_MOODBOARD)
  const moodboardFileRef = useRef<HTMLInputElement>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("design-concept-draft")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.projectInfo) setProjectInfo(parsed.projectInfo)
        if (parsed.designStyle) setDesignStyle(parsed.designStyle)
        if (parsed.primaryColor) setPrimaryColor(parsed.primaryColor)
        if (parsed.secondaryColor) setSecondaryColor(parsed.secondaryColor)
        if (parsed.accentColor) setAccentColor(parsed.accentColor)
        if (parsed.wardrobeFinish) setWardrobeFinish(parsed.wardrobeFinish)
        if (parsed.kitchenFinish) setKitchenFinish(parsed.kitchenFinish)
        if (parsed.wallPanels) setWallPanels(parsed.wallPanels)
        if (parsed.flooringType) setFlooringType(parsed.flooringType)
        if (parsed.countertopMaterial) setCountertopMaterial(parsed.countertopMaterial)
        if (parsed.comments) setComments(parsed.comments)
        if (parsed.revisionNotes) setRevisionNotes(parsed.revisionNotes)
      }
    } catch {}
  }, [])

  const handleWallPanelToggle = (panel: string) => {
    setWallPanels((prev) =>
      prev.includes(panel)
        ? prev.filter((p) => p !== panel)
        : [...prev, panel]
    )
  }

  const handleRemoveImage = (tab: string, imageId: string) => {
    setMoodboardImages((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((img) => img.id !== imageId),
    }))
  }

  const handleMoodboardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newImages: MoodboardImage[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const url = URL.createObjectURL(file)
      newImages.push({ id: `img-${Date.now()}-${i}`, url, name: file.name })
    }
    setMoodboardImages((prev) => ({
      ...prev,
      [activeTab]: [...(prev[activeTab] || []), ...newImages],
    }))
    toast({ title: "Uploaded", description: `${newImages.length} image${newImages.length > 1 ? "s" : ""} added to ${activeTab}` })
    e.target.value = ""
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SALES"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Design Concept
            </h1>
            <p className="text-gray-500 mt-1">
              Define aesthetics, moodboards, and core materials
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/site-survey")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Site Survey
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Sent", description: "Design concept sent for review" })}>
              <Send className="w-4 h-4 mr-2" />
              Send for Review
            </Button>
            <Button onClick={() => {
              localStorage.setItem("design-concept-draft", JSON.stringify({
                projectInfo,
                designStyle, primaryColor, secondaryColor, accentColor,
                wardrobeFinish, kitchenFinish, wallPanels, flooringType, countertopMaterial,
                comments, revisionNotes,
              }))
              toast({ title: "Saved", description: "Design concept saved as draft" })
            }}>
              <Save className="w-4 h-4 mr-2" />
              Save Concept
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <div className="bg-white rounded-xl border p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Client Name</p>
                <Input
                  value={projectInfo.clientName}
                  onChange={(e) => setProjectInfo((s) => ({ ...s, clientName: e.target.value }))}
                  placeholder="Enter client name"
                  className="h-8 mt-0.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Project Location</p>
                <Input
                  value={projectInfo.location}
                  onChange={(e) => setProjectInfo((s) => ({ ...s, location: e.target.value }))}
                  placeholder="Enter location"
                  className="h-8 mt-0.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Property Type</p>
                <Input
                  value={projectInfo.propertyType}
                  onChange={(e) => setProjectInfo((s) => ({ ...s, propertyType: e.target.value }))}
                  placeholder="e.g. 3 BHK Apartment"
                  className="h-8 mt-0.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Palette className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Lead Designer</p>
                <Input
                  value={projectInfo.designer}
                  onChange={(e) => setProjectInfo((s) => ({ ...s, designer: e.target.value }))}
                  placeholder="Enter designer name"
                  className="h-8 mt-0.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Aesthetic Direction */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Aesthetic Direction
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Design Style
              </Label>
              <ChipSelect
                options={DESIGN_STYLES}
                selected={designStyle}
                onSelect={setDesignStyle}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Color Palette
              </Label>
              <div className="flex flex-wrap gap-6">
                <ColorInput
                  label="Primary"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                />
                <ColorInput
                  label="Secondary"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                />
                <ColorInput
                  label="Accent"
                  value={accentColor}
                  onChange={setAccentColor}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Material Selection */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Material Selection
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Wardrobe Finish
              </Label>
              <ChipSelect
                options={WARDROBE_FINISHES}
                selected={wardrobeFinish}
                onSelect={setWardrobeFinish}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Kitchen Finish
              </Label>
              <ChipSelect
                options={KITCHEN_FINISHES}
                selected={kitchenFinish}
                onSelect={setKitchenFinish}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Wall Panels
              </Label>
              <ChipSelect
                options={WALL_PANEL_OPTIONS}
                selected={wallPanels}
                onSelect={handleWallPanelToggle}
                multi
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Flooring Type
                </Label>
                <Input
                  value={flooringType}
                  onChange={(e) => setFlooringType(e.target.value)}
                  placeholder="e.g. Italian Marble, Vitrified Tiles"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Countertop Material
                </Label>
                <Input
                  value={countertopMaterial}
                  onChange={(e) => setCountertopMaterial(e.target.value)}
                  placeholder="e.g. Quartz, Granite, Corian"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Client Feedback */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Client Feedback
            </h2>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Comments / Requirements
              </Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                placeholder="Enter client comments and requirements..."
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Revision Notes
              </Label>
              <Textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={3}
                placeholder="Enter revision notes from designer or manager..."
              />
            </div>
          </div>
        </div>

        {/* Moodboard & References */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <ImageIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Moodboard & References
            </h2>
          </div>

          {/* Tab Buttons */}
          <div className="flex flex-wrap gap-2 mb-5">
            {MOODBOARD_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Hidden file input for moodboard uploads */}
          <input
            ref={moodboardFileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleMoodboardUpload}
          />

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {(moodboardImages[activeTab] || []).map((img) => (
              <div
                key={img.id}
                className="group relative aspect-[4/3] rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
              >
                {img.url ? (
                  <img src={img.url} alt={img.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white truncate">{img.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(activeTab, img.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Add Reference Image Card */}
            <button
              type="button"
              onClick={() => moodboardFileRef.current?.click()}
              className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-xs text-gray-500 font-medium">
                Add Reference Image
              </span>
            </button>

            {(moodboardImages[activeTab] || []).length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No reference images uploaded yet</p>
                <p className="text-xs mt-1">Click &quot;Add Reference Image&quot; to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

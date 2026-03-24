"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import RoleGuard from "@/components/auth/role-guard"
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
  ArrowLeft,
  Save,
  Users,
  Home,
  Upload,
  X,
  ImageIcon,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// ── Constants ──

const PROPERTY_TYPES = ["1BHK", "2BHK", "3BHK", "4BHK", "Villa", "Penthouse"]

const BUDGET_RANGES = [
  "Under ₹5 Lakh",
  "₹5 - 10 Lakh",
  "₹10 - 20 Lakh",
  "₹20 - 35 Lakh",
  "₹35 - 50 Lakh",
  "₹50 Lakh - 1 Cr",
  "Above ₹1 Cr",
]

const DESIGN_STYLES = [
  "Modern",
  "Minimal",
  "Luxury",
  "Contemporary",
  "Traditional",
  "Scandinavian",
]

const SCOPE_OPTIONS = [
  "Full Home",
  "Kitchen",
  "Master Bedroom",
  "Kids Bedroom",
  "Guest Bedroom",
  "Living Room",
  "Dining Room",
  "Bathroom",
  "Balcony",
  "Pooja Room",
  "Study Room",
  "Wardrobe",
  "False Ceiling",
  "Electrical",
  "Painting",
]

// ── Types ──

interface FormState {
  leadName: string
  projectLocation: string
  propertyType: string
  flatSize: string
  budgetRange: string
  designStyles: string[]
  scopeOfWork: string[]
  specialRequirements: string
  referenceIdeas: string
  budgetConstraints: string
  totalMembers: string
  kids: string
  elderlyMembers: string
  pets: string
}

interface UploadedFile {
  id: string
  name: string
  url: string
}

// ── Component ──

export default function ClientRequirementsPage() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>({
    leadName: "",
    projectLocation: "",
    propertyType: "",
    flatSize: "",
    budgetRange: "",
    designStyles: [],
    scopeOfWork: [],
    specialRequirements: "",
    referenceIdeas: "",
    budgetConstraints: "",
    totalMembers: "",
    kids: "",
    elderlyMembers: "",
    pets: "",
  })

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("client-requirements-draft")
      if (saved) {
        const parsed = JSON.parse(saved)
        setForm(parsed)
      }
    } catch {}
  }, [])

  // ── Handlers ──

  const updateField = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  const toggleChip = useCallback(
    (field: "designStyles" | "scopeOfWork", value: string) => {
      setForm((prev) => {
        const current = prev[field]
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
        return { ...prev, [field]: next }
      })
    },
    []
  )

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file),
      }))
      setUploadedFiles((prev) => [...prev, ...newFiles])
    },
    []
  )

  const removeFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleSave = useCallback(() => {
    localStorage.setItem("client-requirements-draft", JSON.stringify(form))
    toast({ title: "Saved", description: "Client requirements saved as draft" })
  }, [form])

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "BDE", "SALES"]}>
      <div className="min-h-screen bg-gray-50/50">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Client Requirements
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Capture and define project scope for{" "}
                <span className="font-medium text-gray-700">
                  {form.leadName || "client"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/sales/leads")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Lead
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="h-4 w-4" />
                Save Requirements
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* ── Main Form (Left) ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Overview Card */}
              <div className="rounded-xl border bg-white p-6">
                <div className="mb-6 flex items-center gap-2">
                  <Home className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Project Overview
                  </h2>
                </div>

                <div className="space-y-5">
                  {/* Lead Name */}
                  <div className="space-y-2">
                    <Label htmlFor="leadName">Lead Name</Label>
                    <Input
                      id="leadName"
                      value={form.leadName}
                      onChange={(e) => updateField("leadName", e.target.value)}
                      placeholder="Enter lead name"
                    />
                  </div>

                  {/* Project Location */}
                  <div className="space-y-2">
                    <Label htmlFor="projectLocation">Project Location</Label>
                    <Input
                      id="projectLocation"
                      value={form.projectLocation}
                      onChange={(e) =>
                        updateField("projectLocation", e.target.value)
                      }
                      placeholder="Enter project address or location"
                    />
                  </div>

                  {/* Property Type + Flat Size */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Property Type</Label>
                      <Select
                        value={form.propertyType}
                        onValueChange={(val) =>
                          updateField("propertyType", val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flatSize">Flat Size (sqft)</Label>
                      <Input
                        id="flatSize"
                        type="number"
                        value={form.flatSize}
                        onChange={(e) =>
                          updateField("flatSize", e.target.value)
                        }
                        placeholder="e.g. 1200"
                      />
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-2">
                    <Label>Budget Range</Label>
                    <Select
                      value={form.budgetRange}
                      onValueChange={(val) =>
                        updateField("budgetRange", val)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select budget range" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUDGET_RANGES.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Design Style Preference */}
                  <div className="space-y-2">
                    <Label>Design Style Preference</Label>
                    <div className="flex flex-wrap gap-2">
                      {DESIGN_STYLES.map((style) => {
                        const selected = form.designStyles.includes(style)
                        return (
                          <button
                            key={style}
                            type="button"
                            onClick={() => toggleChip("designStyles", style)}
                            className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {style}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scope of Work */}
                  <div className="space-y-2">
                    <Label>Scope of Work</Label>
                    <div className="flex flex-wrap gap-2">
                      {SCOPE_OPTIONS.map((scope) => {
                        const selected = form.scopeOfWork.includes(scope)
                        return (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => toggleChip("scopeOfWork", scope)}
                            className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                              selected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {scope}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Special Requirements */}
                  <div className="space-y-2">
                    <Label htmlFor="specialRequirements">
                      Special Requirements
                    </Label>
                    <Textarea
                      id="specialRequirements"
                      value={form.specialRequirements}
                      onChange={(e) =>
                        updateField("specialRequirements", e.target.value)
                      }
                      placeholder="Any specific requirements like Vastu compliance, accessibility needs, etc."
                      rows={3}
                    />
                  </div>

                  {/* Reference Ideas */}
                  <div className="space-y-2">
                    <Label htmlFor="referenceIdeas">Reference Ideas</Label>
                    <Textarea
                      id="referenceIdeas"
                      value={form.referenceIdeas}
                      onChange={(e) =>
                        updateField("referenceIdeas", e.target.value)
                      }
                      placeholder="Pinterest links, Instagram posts, or design ideas the client mentioned"
                      rows={3}
                    />
                  </div>

                  {/* Budget Constraints */}
                  <div className="space-y-2">
                    <Label htmlFor="budgetConstraints">
                      Budget Constraints
                    </Label>
                    <Textarea
                      id="budgetConstraints"
                      value={form.budgetConstraints}
                      onChange={(e) =>
                        updateField("budgetConstraints", e.target.value)
                      }
                      placeholder="Any specific budget limitations or priorities (e.g. allocate more to kitchen)"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Sidebar (Right) ── */}
            <div className="space-y-6">
              {/* Family Details Card */}
              <div className="rounded-xl border bg-white p-6">
                <div className="mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Family Details
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalMembers">Total Members</Label>
                    <Input
                      id="totalMembers"
                      type="number"
                      min={0}
                      value={form.totalMembers}
                      onChange={(e) =>
                        updateField("totalMembers", e.target.value)
                      }
                      placeholder="e.g. 4"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kids">Kids</Label>
                    <Input
                      id="kids"
                      type="number"
                      min={0}
                      value={form.kids}
                      onChange={(e) => updateField("kids", e.target.value)}
                      placeholder="e.g. 2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="elderlyMembers">Elderly Members</Label>
                    <Input
                      id="elderlyMembers"
                      type="number"
                      min={0}
                      value={form.elderlyMembers}
                      onChange={(e) =>
                        updateField("elderlyMembers", e.target.value)
                      }
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pets">Pets</Label>
                    <Input
                      id="pets"
                      value={form.pets}
                      onChange={(e) => updateField("pets", e.target.value)}
                      placeholder="e.g. 1 Dog, 2 Cats"
                    />
                  </div>
                </div>
              </div>

              {/* Uploaded References Card */}
              <div className="rounded-xl border bg-white p-6">
                <div className="mb-6 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Uploaded References
                  </h2>
                </div>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm font-medium text-gray-600">
                    Click or drag to upload
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Images, PDFs, moodboards
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                </div>

                {/* Uploaded File List */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2"
                      >
                        <ImageIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

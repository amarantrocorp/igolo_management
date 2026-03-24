"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Plus,
  Save,
  MapPin,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoomMeasurement {
  id: string
  name: string
  length: string
  width: string
  height: string
  windows: string
  doors: string
  notes: string
}

interface ElectricalPoints {
  lightPoints: string
  fanPoints: string
  acPoints: string
  switchBoards: string
  extraNotes: string
}

interface PlumbingPoints {
  kitchenSinkPoints: string
  washBasins: string
  geyserProvisions: string
  washingMachine: string
  waterChangesNotes: string
}

interface SiteObservations {
  wallCondition: string
  ceilingCondition: string
  floorNotes: string
  beamColumnNotes: string
  specialConstraints: string
}

interface UploadedFile {
  id: string
  name: string
  size: string
  type: "image" | "pdf" | "other"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId() {
  return crypto.randomUUID()
}

function emptyRoom(): RoomMeasurement {
  return {
    id: generateId(),
    name: "",
    length: "",
    width: "",
    height: "",
    windows: "",
    doors: "",
    notes: "",
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SiteSurveyPage() {
  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR", "SALES"]}>
      <SiteSurveyContent />
    </RoleGuard>
  )
}

function SiteSurveyContent() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Project Info ----
  const [projectInfo, setProjectInfo] = useState({
    clientName: "",
    location: "",
    propertyTypeSize: "",
    surveyedBy: "",
  })

  // ---- Room Measurements ----
  const [rooms, setRooms] = useState<RoomMeasurement[]>([emptyRoom()])

  const addRoom = () => setRooms((prev) => [...prev, emptyRoom()])

  const removeRoom = (id: string) =>
    setRooms((prev) => prev.filter((r) => r.id !== id))

  const updateRoom = (
    id: string,
    field: keyof RoomMeasurement,
    value: string
  ) =>
    setRooms((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )

  // ---- Electrical ----
  const [electrical, setElectrical] = useState<ElectricalPoints>({
    lightPoints: "",
    fanPoints: "",
    acPoints: "",
    switchBoards: "",
    extraNotes: "",
  })

  // ---- Plumbing ----
  const [plumbing, setPlumbing] = useState<PlumbingPoints>({
    kitchenSinkPoints: "",
    washBasins: "",
    geyserProvisions: "",
    washingMachine: "",
    waterChangesNotes: "",
  })

  // ---- Site Observations ----
  const [observations, setObservations] = useState<SiteObservations>({
    wallCondition: "",
    ceilingCondition: "",
    floorNotes: "",
    beamColumnNotes: "",
    specialConstraints: "",
  })

  // ---- Files ----
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList) return
    const newFiles: UploadedFile[] = Array.from(fileList).map((f) => ({
      id: generateId(),
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type.startsWith("image/")
        ? "image"
        : f.type === "application/pdf"
          ? "pdf"
          : "other",
    }))
    setFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id))

  // ---- Save handler ----
  const handleSave = () => {
    localStorage.setItem("site-survey-draft", JSON.stringify({ projectInfo, rooms, electrical, plumbing, observations }))
    toast({ title: "Saved", description: "Site survey data saved as draft" })
  }

  // ---- Load from localStorage on mount ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem("site-survey-draft")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.projectInfo) setProjectInfo(parsed.projectInfo)
        if (parsed.rooms) setRooms(parsed.rooms)
        if (parsed.electrical) setElectrical(parsed.electrical)
        if (parsed.plumbing) setPlumbing(parsed.plumbing)
        if (parsed.observations) setObservations(parsed.observations)
      }
    } catch {}
  }, [])

  // ---- Drag & drop ----
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="space-y-6">
      {/* ----- Header ----- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Site Survey</h1>
          <p className="text-muted-foreground">
            Record on-site measurements and observations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/client-requirements")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Requirements
          </Button>
          <Button variant="outline" onClick={addRoom}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Survey
          </Button>
        </div>
      </div>

      {/* ----- Project Information ----- */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Project Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Client Name</Label>
            <Input
              placeholder="Enter client name"
              value={projectInfo.clientName}
              onChange={(e) => setProjectInfo((s) => ({ ...s, clientName: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              <MapPin className="mr-1 inline h-3 w-3" />
              Project Location
            </Label>
            <Input
              placeholder="Enter location"
              value={projectInfo.location}
              onChange={(e) => setProjectInfo((s) => ({ ...s, location: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              Property Type & Size
            </Label>
            <Input
              placeholder="e.g. 3 BHK - 1,850 sq ft"
              value={projectInfo.propertyTypeSize}
              onChange={(e) => setProjectInfo((s) => ({ ...s, propertyTypeSize: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-xs">Survey Date</Label>
            <p className="mt-1 text-sm font-medium">
              {new Date().toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Surveyed By</Label>
            <Input
              placeholder="Enter surveyor name"
              value={projectInfo.surveyedBy}
              onChange={(e) => setProjectInfo((s) => ({ ...s, surveyedBy: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* ----- Room Measurements ----- */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Room Measurements</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Room Name</TableHead>
                <TableHead className="min-w-[90px]">Length (L)</TableHead>
                <TableHead className="min-w-[90px]">Width (W)</TableHead>
                <TableHead className="min-w-[90px]">Height (H)</TableHead>
                <TableHead className="min-w-[80px]">Windows</TableHead>
                <TableHead className="min-w-[80px]">Doors</TableHead>
                <TableHead className="min-w-[160px]">Notes</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell>
                    <Input
                      placeholder="e.g. Master Bedroom"
                      value={room.name}
                      onChange={(e) =>
                        updateRoom(room.id, "name", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="ft"
                      value={room.length}
                      onChange={(e) =>
                        updateRoom(room.id, "length", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="ft"
                      value={room.width}
                      onChange={(e) =>
                        updateRoom(room.id, "width", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="ft"
                      value={room.height}
                      onChange={(e) =>
                        updateRoom(room.id, "height", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="0"
                      value={room.windows}
                      onChange={(e) =>
                        updateRoom(room.id, "windows", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="0"
                      value={room.doors}
                      onChange={(e) =>
                        updateRoom(room.id, "doors", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Any notes..."
                      value={room.notes}
                      onChange={(e) =>
                        updateRoom(room.id, "notes", e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRoom(room.id)}
                      disabled={rooms.length === 1}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={addRoom}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Room
        </Button>
      </div>

      {/* ----- Electrical Points ----- */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Electrical Points</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Light Points Required</Label>
            <Input
              placeholder="e.g. 24"
              value={electrical.lightPoints}
              onChange={(e) =>
                setElectrical((s) => ({ ...s, lightPoints: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Fan Points</Label>
            <Input
              placeholder="e.g. 6"
              value={electrical.fanPoints}
              onChange={(e) =>
                setElectrical((s) => ({ ...s, fanPoints: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>AC Points</Label>
            <Input
              placeholder="e.g. 3"
              value={electrical.acPoints}
              onChange={(e) =>
                setElectrical((s) => ({ ...s, acPoints: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Switch Boards (Shifting)</Label>
            <Input
              placeholder="e.g. 8"
              value={electrical.switchBoards}
              onChange={(e) =>
                setElectrical((s) => ({ ...s, switchBoards: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Extra Electrical Points / Notes</Label>
          <Textarea
            placeholder="Any additional electrical requirements or observations..."
            value={electrical.extraNotes}
            onChange={(e) =>
              setElectrical((s) => ({ ...s, extraNotes: e.target.value }))
            }
          />
        </div>
      </div>

      {/* ----- Plumbing Points ----- */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Plumbing Points</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Kitchen Sink Points</Label>
            <Input
              placeholder="e.g. 2"
              value={plumbing.kitchenSinkPoints}
              onChange={(e) =>
                setPlumbing((s) => ({
                  ...s,
                  kitchenSinkPoints: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Wash Basins</Label>
            <Input
              placeholder="e.g. 3"
              value={plumbing.washBasins}
              onChange={(e) =>
                setPlumbing((s) => ({ ...s, washBasins: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Geyser Provisions</Label>
            <Input
              placeholder="e.g. 2"
              value={plumbing.geyserProvisions}
              onChange={(e) =>
                setPlumbing((s) => ({
                  ...s,
                  geyserProvisions: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Washing Machine</Label>
            <Input
              placeholder="e.g. 1"
              value={plumbing.washingMachine}
              onChange={(e) =>
                setPlumbing((s) => ({ ...s, washingMachine: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Water Inlet/Outlet Changes</Label>
          <Textarea
            placeholder="Describe any water inlet/outlet changes required..."
            value={plumbing.waterChangesNotes}
            onChange={(e) =>
              setPlumbing((s) => ({
                ...s,
                waterChangesNotes: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* ----- Site Observations ----- */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Site Observations</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Wall Condition</Label>
            <Input
              placeholder="e.g. Good / Dampness on north wall"
              value={observations.wallCondition}
              onChange={(e) =>
                setObservations((s) => ({
                  ...s,
                  wallCondition: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Ceiling Condition</Label>
            <Input
              placeholder="e.g. Minor cracks near beam"
              value={observations.ceilingCondition}
              onChange={(e) =>
                setObservations((s) => ({
                  ...s,
                  ceilingCondition: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Floor Level / Tiling Notes</Label>
            <Input
              placeholder="e.g. Uneven near balcony entry"
              value={observations.floorNotes}
              onChange={(e) =>
                setObservations((s) => ({ ...s, floorNotes: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Beam & Column Notes</Label>
            <Input
              placeholder="e.g. Load-bearing column in living room"
              value={observations.beamColumnNotes}
              onChange={(e) =>
                setObservations((s) => ({
                  ...s,
                  beamColumnNotes: e.target.value,
                }))
              }
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Special Constraints</Label>
          <Textarea
            placeholder="Any special constraints, access issues, society rules, etc..."
            value={observations.specialConstraints}
            onChange={(e) =>
              setObservations((s) => ({
                ...s,
                specialConstraints: e.target.value,
              }))
            }
          />
        </div>
      </div>

      {/* ----- Site Photos & Files ----- */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Site Photos & Files</h2>

        {/* Drop zone */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFileSelect(e.dataTransfer.files)
          }}
        >
          <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag and drop images, PDFs, or raw measurement sheets
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            or click to browse files
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

        {/* File list */}
        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border px-4 py-2"
              >
                <div className="flex items-center gap-3">
                  {file.type === "image" ? (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <FileText className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {file.size}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

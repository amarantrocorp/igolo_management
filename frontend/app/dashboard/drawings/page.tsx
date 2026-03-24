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
  Upload,
  Plus,
  Send,
  Image as ImageIcon,
  User,
  MapPin,
  Home,
  Palette,
  Calendar,
  Filter,
  LayoutGrid,
  MessageSquare,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// ── Constants ──

const DRAWING_TYPES = [
  "All",
  "2D Layout",
  "Furniture Layout",
  "Electrical Layout",
  "Ceiling Layout",
  "Plumbing Layout",
  "3D View",
]

const ROOM_FILTERS = [
  "All Rooms",
  "Living Room",
  "Kitchen",
  "Master Bedroom",
  "Guest Bedroom",
  "Bathroom",
  "Balcony",
  "Dining Area",
]

// ── Sample Drawing Data ──

interface Drawing {
  id: string
  title: string
  room: string
  type: string
  designer: string
  date: string
  version: string
  gradientFrom?: string
  gradientTo?: string
  thumbnail?: string
}

// Drawings are loaded from localStorage; starts empty

// ── Revision Request Data ──

interface RevisionRequest {
  id: string
  text: string
  status: "Pending" | "Resolved"
  date: string
}

// Revisions are loaded from localStorage; starts empty

// ── Drawing Card Component ──

function DrawingCard({ drawing }: { drawing: Drawing }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer">
      {/* Thumbnail */}
      <div
        className={`aspect-[16/10] bg-gradient-to-br ${drawing.gradientFrom} ${drawing.gradientTo} flex items-center justify-center relative`}
      >
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <LayoutGrid className="w-10 h-10 opacity-40" />
          <span className="text-[10px] font-medium opacity-60">
            {drawing.type}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <Badge
            variant="secondary"
            className="bg-white/80 backdrop-blur text-xs font-semibold"
          >
            {drawing.version}
          </Badge>
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {drawing.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-[11px] px-2 py-0">
            {drawing.room}
          </Badge>
          <Badge variant="outline" className="text-[11px] px-2 py-0">
            {drawing.type}
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-3 h-3 text-primary" />
            </div>
            <span className="text-xs text-gray-600">{drawing.designer}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar className="w-3 h-3" />
            {drawing.date}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──

export default function DrawingsPage() {
  const router = useRouter()

  // Project Info
  const [projectInfo, setProjectInfo] = useState({
    clientName: "",
    projectName: "",
    propertyType: "",
    designer: "",
  })

  // Filters
  const [typeFilter, setTypeFilter] = useState("All")
  const [roomFilter, setRoomFilter] = useState("All Rooms")

  // Drawings
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const drawingInputRef = useRef<HTMLInputElement>(null)

  function handleDrawingUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newDrawings: Drawing[] = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      title: file.name.replace(/\.[^.]+$/, ""),
      type: "2D Layout",
      room: "General",
      version: "v1",
      designer: "You",
      date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      thumbnail: URL.createObjectURL(file),
    }))
    setDrawings((prev) => [...newDrawings, ...prev])
    toast({ title: "Uploaded", description: `${files.length} drawing${files.length > 1 ? "s" : ""} added to library` })
    e.target.value = ""
  }

  // Client comments
  const [reviewNotes, setReviewNotes] = useState("")
  const [revisions, setRevisions] = useState<RevisionRequest[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("drawings-draft")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.projectInfo) setProjectInfo(parsed.projectInfo)
        if (parsed.drawings) setDrawings(parsed.drawings)
        if (parsed.revisions) setRevisions(parsed.revisions)
      }
    } catch {}
  }, [])

  // Save handler
  const handleSave = () => {
    localStorage.setItem("drawings-draft", JSON.stringify({ projectInfo, drawings, revisions }))
    toast({ title: "Saved", description: "Drawings data saved as draft" })
  }

  // Filter drawings
  const filteredDrawings = drawings.filter((d) => {
    const typeMatch = typeFilter === "All" || d.type === typeFilter
    const roomMatch = roomFilter === "All Rooms" || d.room === roomFilter
    return typeMatch && roomMatch
  })

  const handleAddRevision = () => {
    if (!reviewNotes.trim()) return
    const newRevision: RevisionRequest = {
      id: String(Date.now()),
      text: reviewNotes.trim(),
      status: "Pending",
      date: new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }
    setRevisions((prev) => [newRevision, ...prev])
    setReviewNotes("")
  }

  const toggleRevisionStatus = (id: string) => {
    setRevisions((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: r.status === "Pending" ? "Resolved" : "Pending" }
          : r
      )
    )
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SALES"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Space Planning & Drawings
            </h1>
            <p className="text-gray-500 mt-1">
              Manage 2D layouts, 3D views, and technical drawings
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/design-concepts")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Design Concept
            </Button>
            <input
              ref={drawingInputRef}
              type="file"
              accept="image/*,.pdf,.dwg"
              multiple
              className="hidden"
              onChange={handleDrawingUpload}
            />
            <Button variant="outline" onClick={() => drawingInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Drawing
            </Button>
            <Button variant="outline" onClick={() => toast({ title: "Layout Added", description: "Layout added to library" })}>
              <Plus className="w-4 h-4 mr-2" />
              Add Layout
            </Button>
            <Button variant="outline" onClick={handleSave}>
              <FileText className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button onClick={() => toast({ title: "Sent", description: "Drawings sent to client for review" })}>
              <Send className="w-4 h-4 mr-2" />
              Send for Client Review
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
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Project Name</p>
                <Input
                  value={projectInfo.projectName}
                  onChange={(e) => setProjectInfo((s) => ({ ...s, projectName: e.target.value }))}
                  placeholder="Enter project name"
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
                <p className="text-xs text-gray-500">Designer</p>
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

        {/* Drawing Library */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Drawing Library
            </h2>
            <Badge variant="secondary" className="ml-2">
              {filteredDrawings.length} drawings
            </Badge>
          </div>

          {/* Filters */}
          <div className="space-y-4 mb-6">
            {/* Type Filter */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter by Type
              </Label>
              <div className="flex flex-wrap gap-2">
                {DRAWING_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      typeFilter === type
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Filter */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filter by Room
              </Label>
              <div className="flex flex-wrap gap-2">
                {ROOM_FILTERS.map((room) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setRoomFilter(room)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      roomFilter === room
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drawing Grid */}
          {drawings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Upload className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No drawings uploaded yet</p>
              <p className="text-xs mt-1">Upload your first drawing to get started</p>
            </div>
          ) : filteredDrawings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDrawings.map((drawing) => (
                <DrawingCard key={drawing.id} drawing={drawing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No drawings match the selected filters</p>
              <p className="text-xs mt-1">Try changing the type or room filter</p>
            </div>
          )}
        </div>

        {/* Client Comments */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">
              Client Comments
            </h2>
          </div>

          <div className="space-y-5">
            {/* Review Notes */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Review Notes
              </Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Enter review notes or client feedback on drawings..."
              />
            </div>

            {/* Revision Requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-medium text-gray-700">
                  Revision Requests
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddRevision}
                  disabled={!reviewNotes.trim()}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Revision Request
                </Button>
              </div>

              <div className="space-y-2">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50"
                  >
                    <button
                      type="button"
                      onClick={() => toggleRevisionStatus(rev.id)}
                      className="mt-0.5 shrink-0"
                    >
                      {rev.status === "Resolved" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          rev.status === "Resolved"
                            ? "text-gray-400 line-through"
                            : "text-gray-700"
                        }`}
                      >
                        {rev.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-gray-400">
                          {rev.date}
                        </span>
                        <Badge
                          variant={
                            rev.status === "Resolved"
                              ? "secondary"
                              : "default"
                          }
                          className="text-[10px] px-1.5 py-0"
                        >
                          {rev.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}

                {revisions.length === 0 && (
                  <div className="text-center py-6 text-gray-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No revision requests yet</p>
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

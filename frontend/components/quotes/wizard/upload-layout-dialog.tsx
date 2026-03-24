"use client"

import { useState } from "react"
import axios from "axios"
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, X, MapPin, Maximize2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/ui/file-upload"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import type { FloorPlanAnalysis } from "@/types/quote-wizard"

const FLOORPLAN_AI_URL = process.env.NEXT_PUBLIC_FLOORPLAN_AI_URL || "http://localhost:8001"

interface UploadLayoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AnalysisState =
  | { status: "idle" }
  | { status: "analyzing" }
  | { status: "success"; data: FloorPlanAnalysis }
  | { status: "error"; message: string }

export function UploadLayoutDialog({
  open,
  onOpenChange,
}: UploadLayoutDialogProps) {
  const { setEntryMode, setUploadedLayout, applyFloorPlanAnalysis } = useQuoteWizardStore()
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisState>({ status: "idle" })

  async function handleAnalyze() {
    if (!uploadedUrl) return

    setAnalysis({ status: "analyzing" })

    try {
      const response = await axios.post(`${FLOORPLAN_AI_URL}/api/analyze`, {
        image_url: uploadedUrl,
      }, { timeout: 300000 })  // 5 min — Ollama vision models can be slow

      const result: FloorPlanAnalysis = response.data.data
      setAnalysis({ status: "success", data: result })
    } catch (err: any) {
      console.error("Floor plan analysis error:", err.response?.data || err.message)
      const detail = err.response?.data?.detail
      const status = err.response?.status
      let message: string
      if (detail) {
        message = detail
      } else if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
        message = "Analysis timed out. The AI model may be overloaded. Try again or use a smaller image."
      } else if (!err.response) {
        message = "Cannot reach the AI service. Make sure floorplan-ai is running."
      } else {
        message = `Analysis failed (HTTP ${status}). Please try again or add rooms manually.`
      }
      setAnalysis({ status: "error", message })
    }
  }

  function handleApplyAndContinue() {
    if (analysis.status !== "success") return

    if (uploadedUrl) {
      setUploadedLayout(uploadedUrl)
    }

    applyFloorPlanAnalysis(analysis.data)
    onOpenChange(false)
    setEntryMode("upload")
  }

  function handleSkip() {
    if (uploadedUrl) {
      setUploadedLayout(uploadedUrl)
    }
    onOpenChange(false)
    setEntryMode("upload")
  }

  function handleClose(value: boolean) {
    if (!value) {
      setUploadedUrl(null)
      setAnalysis({ status: "idle" })
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Floor Plan</DialogTitle>
          <DialogDescription>
            Upload your floor plan image or PDF. AI will detect rooms, dimensions, and suggest interior items.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Area */}
        {analysis.status === "idle" || analysis.status === "error" ? (
          <div className="py-2">
            <FileUpload
              value={uploadedUrl}
              onChange={(url) => {
                setUploadedUrl(url)
                setAnalysis({ status: "idle" })
              }}
              category="quotes"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              maxSizeMB={15}
              label="Floor Plan"
            />
          </div>
        ) : null}

        {/* Analyzing State */}
        {analysis.status === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium">Analyzing floor plan...</p>
              <p className="text-sm text-muted-foreground">
                Detecting rooms, dimensions, and suggesting items
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {analysis.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-700">Analysis Failed</p>
                <p className="text-red-600 mt-0.5">{analysis.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State — Results Summary */}
        {analysis.status === "success" && (
          <div className="space-y-3">
            {/* Confidence Warning */}
            {analysis.data.confidence < 0.5 && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <p className="text-orange-700">
                  Low confidence analysis. Please verify the detected rooms and dimensions.
                </p>
              </div>
            )}

            {/* Summary Card */}
            <div className="rounded-lg border bg-green-50/50 border-green-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Analysis Complete</span>
                <span className="ml-auto text-xs text-muted-foreground rounded-full bg-white px-2 py-0.5 border">
                  {Math.round(analysis.data.confidence * 100)}% confident
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {analysis.data.bhk_config && (
                  <div className="rounded-md bg-white border p-2">
                    <p className="text-lg font-bold">{analysis.data.bhk_config}</p>
                    <p className="text-xs text-muted-foreground">Configuration</p>
                  </div>
                )}
                <div className="rounded-md bg-white border p-2">
                  <p className="text-lg font-bold">{analysis.data.rooms.length}</p>
                  <p className="text-xs text-muted-foreground">Rooms</p>
                </div>
                {analysis.data.total_carpet_area_sqft && (
                  <div className="rounded-md bg-white border p-2">
                    <p className="text-lg font-bold">{Math.round(analysis.data.total_carpet_area_sqft)}</p>
                    <p className="text-xs text-muted-foreground">sqft</p>
                  </div>
                )}
              </div>

              {/* Room List */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Detected Rooms</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.data.rooms.map((room, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1 text-xs font-medium"
                    >
                      <MapPin className="h-3 w-3 text-primary" />
                      {room.name}
                      {room.area_sqft && (
                        <span className="text-muted-foreground">
                          {Math.round(room.area_sqft)} sqft
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {analysis.data.notes && (
                <p className="text-xs text-muted-foreground italic border-t pt-2">
                  {analysis.data.notes}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {analysis.status === "success" ? (
            <>
              <Button variant="outline" onClick={handleSkip}>
                Ignore & Add Manually
              </Button>
              <Button onClick={handleApplyAndContinue} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Apply & Continue
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleSkip}>
                Skip & Add Manually
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={!uploadedUrl || analysis.status === "analyzing"}
                className="gap-2"
              >
                {analysis.status === "analyzing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Analyze Layout
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

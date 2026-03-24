"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Download,
  Send,
  Copy,
  ArrowRightCircle,
  FileText,
  Info,
  Loader2,
} from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { buildQuotePayload } from "@/lib/quote-wizard-calc"
import { GST_RATE, PACKAGES } from "@/lib/quote-wizard-constants"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date())
}

export function StepGenerate() {
  const router = useRouter()
  const { toast } = useToast()

  const state = useQuoteWizardStore()
  const {
    projectDetails,
    rooms,
    costBreakdown,
    resetWizard,
  } = state

  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null)

  const pkg = PACKAGES.find((p) => p.key === projectDetails.packageType)

  // ── Create quotation mutation ──

  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      const payload = buildQuotePayload(state)
      const response = await api.post("/quotes", payload)
      return response.data
    },
    onSuccess: (data) => {
      const id = data?.id ?? data?.data?.id
      setSavedQuoteId(id)
      toast({
        title: "Quotation saved successfully",
        description: `Quote ${id ? `#${id.slice(0, 8)}` : ""} has been created.`,
      })
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail
                .map((d: any) => d.msg || d.detail || JSON.stringify(d))
                .join(", ")
            : error?.message ?? "Failed to create quotation. Please check all fields."
      toast({
        title: "Failed to save quotation",
        description: message,
        variant: "destructive",
      })
    },
  })

  // ── Download PDF ──

  const handleDownloadPDF = async () => {
    if (!savedQuoteId) return
    try {
      const response = await api.get(`/quotes/${savedQuoteId}/pdf`, {
        responseType: "blob",
      })
      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `quotation-${savedQuoteId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast({
        title: "PDF download failed",
        description: "Could not generate the PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ── Send to client ──

  const handleSendToClient = async () => {
    if (!savedQuoteId) return
    try {
      await api.post(`/quotes/${savedQuoteId}/send`)
      toast({
        title: "Quotation sent",
        description: `Sent to ${projectDetails.clientEmail}`,
      })
    } catch {
      toast({
        title: "Failed to send",
        description: "Could not send the quotation. Please try again.",
        variant: "destructive",
      })
    }
  }

  // ── Duplicate ──

  const handleDuplicate = () => {
    toast({
      title: "Wizard state preserved",
      description: "Modify the details and generate a new quotation.",
    })
  }

  // ── Convert to project ──

  const handleConvertToProject = async () => {
    if (!savedQuoteId) return
    try {
      await api.post(`/projects/convert/${savedQuoteId}`)
      toast({ title: "Project created from quotation" })
      resetWizard()
      router.push("/dashboard/projects")
    } catch {
      toast({
        title: "Conversion failed",
        description: "Could not convert to project. Ensure the quote is approved.",
        variant: "destructive",
      })
    }
  }

  // ── Computed values ──

  const quoteNumber = savedQuoteId
    ? `QT-${savedQuoteId.slice(0, 8).toUpperCase()}`
    : `QT-${Date.now().toString(36).toUpperCase()}`

  const gstPercent = Math.round(GST_RATE * 100)

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="flex flex-col items-center text-center py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 animate-in zoom-in-50 duration-300" />
        </div>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">
          Quotation Ready!
        </h2>
        <p className="mt-1 text-2xl font-bold text-primary">
          Total Value: {formatINR(costBreakdown.finalAmount)}
        </p>
      </div>

      {/* Preview card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-base font-semibold">
                Interior Design Quotation
              </CardTitle>
            </div>
            <div className="text-right text-xs">
              <p className="font-mono">{quoteNumber}</p>
              <p className="opacity-80">{formatDate()}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          {/* Client details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Client Details
            </p>
            <div className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-3">
              <div>
                <span className="text-muted-foreground">Name: </span>
                <span className="font-medium">
                  {projectDetails.clientName || "---"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-medium">
                  {projectDetails.clientEmail || "---"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone: </span>
                <span className="font-medium">
                  {projectDetails.clientPhone || "---"}
                </span>
              </div>
            </div>
          </div>

          {/* Project scope */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Project Scope
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1 text-sm sm:grid-cols-4">
              <div>
                <span className="text-muted-foreground">Property: </span>
                <span className="font-medium">
                  {projectDetails.propertyType || "---"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Area: </span>
                <span className="font-medium">
                  {projectDetails.flatSizeSqft
                    ? `${projectDetails.flatSizeSqft} sqft`
                    : "---"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">City: </span>
                <span className="font-medium">
                  {projectDetails.city || "---"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Package: </span>
                <span className="font-medium">{pkg?.label ?? "---"}</span>
              </div>
            </div>
          </div>

          {/* Rooms included */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Rooms Included
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <Badge key={room.key} variant="secondary">
                    {room.label}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">
                  No rooms selected
                </span>
              )}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Base Interior Cost
              </span>
              <span>{formatINR(costBreakdown.baseCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Material Upgrades
              </span>
              <span>
                {costBreakdown.materialUpgrade > 0 ? "+ " : ""}
                {formatINR(costBreakdown.materialUpgrade)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Hardware Upgrades
              </span>
              <span>
                {costBreakdown.hardwareUpgrade > 0 ? "+ " : ""}
                {formatINR(costBreakdown.hardwareUpgrade)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Add-ons</span>
              <span>
                {costBreakdown.addonsCost > 0 ? "+ " : ""}
                {formatINR(costBreakdown.addonsCost)}
              </span>
            </div>
            {costBreakdown.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                <span>Discount</span>
                <span>- {formatINR(costBreakdown.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                GST ({gstPercent}%)
              </span>
              <span>{formatINR(costBreakdown.gst)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between text-base font-bold">
              <span>Total Amount</span>
              <span className="text-primary">
                {formatINR(costBreakdown.finalAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
            !savedQuoteId ? "opacity-50 pointer-events-none" : ""
          }`}
          onClick={handleDownloadPDF}
        >
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Download className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">Download PDF</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Save as document
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
            !savedQuoteId ? "opacity-50 pointer-events-none" : ""
          }`}
          onClick={handleSendToClient}
        >
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Send className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">Send to Client</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Email quotation
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm"
          onClick={handleDuplicate}
        >
          <CardContent className="flex flex-col items-center p-4 text-center">
            <Copy className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">Duplicate</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reuse as template
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
            !savedQuoteId ? "opacity-50 pointer-events-none" : ""
          }`}
          onClick={handleConvertToProject}
        >
          <CardContent className="flex flex-col items-center p-4 text-center">
            <ArrowRightCircle className="h-6 w-6 text-primary" />
            <p className="mt-2 text-sm font-medium">Convert to Project</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Start execution
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next steps info */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              Next Steps after approval
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-blue-800 dark:text-blue-400">
              <li>
                Client reviews and approves the quotation via email or portal
              </li>
              <li>
                Once approved, convert to project to begin the 6-sprint
                execution cycle
              </li>
              <li>
                Standard sprints will be auto-generated with calculated
                timelines
              </li>
              <li>
                Project wallet will be initialized for financial tracking
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Complete Quotation button */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          disabled={createQuoteMutation.isPending}
          onClick={() => createQuoteMutation.mutate()}
        >
          {createQuoteMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : savedQuoteId ? (
            "Quotation Saved"
          ) : (
            "Complete Quotation"
          )}
        </Button>
      </div>
    </div>
  )
}

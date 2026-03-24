"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Quotation } from "@/types"

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-yellow-100 text-yellow-700",
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

interface ReuseQuoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReuseQuoteDialog({
  open,
  onOpenChange,
}: ReuseQuoteDialogProps) {
  const { setEntryMode } = useQuoteWizardStore()
  const toggleRoom = useQuoteWizardStore((s) => s.toggleRoom)
  const [search, setSearch] = useState("")
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const { data: quotations, isLoading } = useQuery<Quotation[]>({
    queryKey: ["quotes-for-reuse"],
    queryFn: async () => {
      const res = await api.get("/quotes")
      return res.data
    },
    enabled: open,
  })

  const filtered = useMemo(() => {
    if (!quotations) return []
    if (!search.trim()) return quotations

    const term = search.toLowerCase()
    return quotations.filter((q) => {
      const leadName = q.lead?.name?.toLowerCase() ?? ""
      const quoteNum = `QT-${q.id.slice(0, 8)}`.toLowerCase()
      return leadName.includes(term) || quoteNum.includes(term)
    })
  }, [quotations, search])

  async function handleSelect(quote: Quotation) {
    setLoadingId(quote.id)

    try {
      // Fetch full quotation with rooms if not already populated
      let fullQuote = quote
      if (!fullQuote.rooms || fullQuote.rooms.length === 0) {
        const res = await api.get(`/quotes/${quote.id}`)
        fullQuote = res.data
      }

      // Populate wizard store rooms from the selected quotation
      if (fullQuote.rooms) {
        for (const room of fullQuote.rooms) {
          toggleRoom(room.name.toUpperCase().replace(/\s+/g, "_"), room.name)
        }
      }

      onOpenChange(false)
      setEntryMode("reuse")
    } catch {
      alert("Failed to load quotation details. Please try again.")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Reuse Previous Quotation</DialogTitle>
          <DialogDescription>
            Select a quotation to clone as a starting point
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by lead name or quote number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {search ? "No quotations match your search" : "No quotations found"}
            </div>
          ) : (
            filtered.map((q) => {
              const isSelecting = loadingId === q.id

              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={isSelecting}
                  onClick={() => handleSelect(q)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-all",
                    "hover:border-primary/50 hover:shadow-sm",
                    isSelecting && "opacity-60 pointer-events-none"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          QT-{q.id.slice(0, 8).toUpperCase()}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            STATUS_COLORS[q.status] ?? "bg-gray-100 text-gray-700"
                          )}
                        >
                          {q.status}
                        </span>
                      </div>
                      {q.lead?.name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {q.lead.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        v{q.version} &middot; {formatDate(q.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatINR(q.total_amount)}
                      </p>
                      {isSelecting && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                    </div>
                  </div>

                  {q.rooms && q.rooms.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.rooms.slice(0, 4).map((room) => (
                        <span
                          key={room.id}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {room.name}
                        </span>
                      ))}
                      {q.rooms.length > 4 && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{q.rooms.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ShieldCheck,
  XCircle,
  RotateCcw,
  CheckCircle2,
  User,
  Building2,
  FileText,
  AlertTriangle,
  Inbox,
  Loader2,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { toast } from "@/components/ui/use-toast"
import { useAuthStore } from "@/store/auth-store"

interface QuoteItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  final_price: number
  markup_percentage: number
}

interface QuoteRoom {
  id: string
  name: string
  area_sqft: number
  items: QuoteItem[]
}

interface Quotation {
  id: string
  lead_id: string
  version: number
  total_amount: number
  status: string
  rooms: QuoteRoom[]
}

interface CategoryRow {
  category: string
  material: number
  total: number
}

function formatINR(val: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val)
}

function buildCategoryBreakdown(quote: Quotation): CategoryRow[] {
  const map = new Map<string, number>()
  for (const room of quote.rooms || []) {
    let roomTotal = 0
    for (const item of room.items || []) {
      roomTotal += item.final_price
    }
    map.set(room.name, (map.get(room.name) || 0) + roomTotal)
  }
  return Array.from(map.entries()).map(([name, total]) => ({
    category: name,
    material: total,
    total,
  }))
}

export default function BudgetApprovalPage() {
  const router = useRouter()
  const [decision, setDecision] = useState("")
  const [comments, setComments] = useState("")
  const { user } = useAuthStore()

  // Fetch latest approved quote for budget review
  const { data: quote, isLoading } = useQuery<Quotation | null>({
    queryKey: ["budget-approval-quote"],
    queryFn: async () => {
      try {
        const res = await api.get("/quotes?limit=1&status=APPROVED")
        const quotes = Array.isArray(res.data) ? res.data : res.data?.items || []
        return quotes.length > 0 ? quotes[0] : null
      } catch {
        return null
      }
    },
  })

  if (isLoading) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading budget data...</span>
        </div>
      </RoleGuard>
    )
  }

  if (!quote) {
    return (
      <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
        <div className="space-y-6 p-4 md:p-6">
          <PageHeader
            icon={ShieldCheck}
            title="Budget Approval"
            subtitle="Pending Review"
            gradient="linear-gradient(135deg, #F59E0B, #EF4444)"
          />
          <div className="rounded-xl border bg-white">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 mb-4">
                <Inbox className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-base font-medium text-muted-foreground">No BOQ pending approval</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-md">
                Generate a BOQ from an approved quotation first, then send it here for budget approval.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => router.push("/dashboard/boq")}>
                Go to BOQ
              </Button>
            </div>
          </div>
        </div>
      </RoleGuard>
    )
  }

  const breakdown = buildCategoryBreakdown(quote)
  const materialTotal = breakdown.reduce((s, r) => s + r.material, 0)
  const grandTotal = breakdown.reduce((s, r) => s + r.total, 0)

  const contingencyPct = 5
  const contingencyAmt = Math.round(grandTotal * (contingencyPct / 100))
  const totalInternalCost = grandTotal + contingencyAmt
  const targetMarginPct = 25
  const clientQuoteValue = Math.round(totalInternalCost / (1 - targetMarginPct / 100))

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <PageHeader
          icon={ShieldCheck}
          title="Budget Approval"
          subtitle={`Pending Review \u2022 Quote v${quote.version}`}
          gradient="linear-gradient(135deg, #F59E0B, #EF4444)"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => {
                setDecision("rejected")
                toast({ title: "Budget Rejected", description: "Budget has been rejected", variant: "destructive" })
              }}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setDecision("revision")
                toast({ title: "Revision Requested", description: "Revision requested \u2014 budget sent back for adjustments" })
              }}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Request Revision
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                if (!window.confirm("Are you sure you want to approve this budget and convert to a project? This action cannot be undone.")) return
                setDecision("approved")
                toast({ title: "Budget Approved", description: "Budget approved! Project conversion initiated" })
                setTimeout(() => router.push("/dashboard/projects"), 1500)
              }}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve Budget & Convert
              </Button>
            </div>
          }
        />

        {/* Quotation Context */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Quotation Context
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Quotation ID</p>
                <p className="font-medium text-sm">{quote.id}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="font-medium text-sm">v{quote.version}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="success" className="text-xs">{quote.status}</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Category Cost Breakdown */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Room-wise Cost Breakdown
          </h3>
          {breakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No room data available in this quotation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell className="font-medium">{row.category}</TableCell>
                      <TableCell className="text-right font-semibold">{formatINR(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{formatINR(grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Financial Summary
          </h3>
          <div className="mx-auto max-w-md space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Base Estimated Cost</span>
              <span className="font-medium">{formatINR(grandTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Contingency Risk</span>
              <Badge variant="secondary" className="text-xs">{contingencyPct}%</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Internal Cost</span>
              <span className="font-semibold">{formatINR(totalInternalCost)}</span>
            </div>
            <div className="border-t pt-3" />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Margin</span>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{targetMarginPct}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Final Client Quote Value</span>
              <span className="text-lg font-bold text-primary">{formatINR(clientQuoteValue)}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Minimum recommended margin is 20%. Projects approved below this threshold require Super Admin sign-off.
              </p>
            </div>
          </div>
        </div>

        {/* Approval Details */}
        <div className="rounded-xl border bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Approval Details
          </h3>
          <div className="mx-auto max-w-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Approver</p>
                <p className="font-medium">{user?.full_name || "Current User"} ({user?.role || "Manager"})</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="decision">Decision</Label>
              <Select value={decision} onValueChange={setDecision}>
                <SelectTrigger id="decision">
                  <SelectValue placeholder="Select decision..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="revision">Request Revision</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any notes or conditions for this budget decision..."
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date</Label>
              <p className="text-sm font-medium">
                {new Date().toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

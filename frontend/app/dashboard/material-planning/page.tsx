"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Download,
  Plus,
  Search,
  RefreshCw,
  X,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { exportCSV } from "@/lib/export-csv"

interface MaterialItem {
  id: string
  name: string
  category: string
  unit: string
  currentStock: number
  reorderLevel: number
  lastPurchaseRate: number
  preferredVendor: string
}

// Map API inventory item to MaterialItem
function mapApiItem(item: any): MaterialItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category || "Uncategorized",
    unit: item.unit || "nos",
    currentStock: Number(item.current_stock) || 0,
    reorderLevel: Number(item.reorder_level) || 0,
    lastPurchaseRate: Number(item.base_price) || 0,
    preferredVendor: item.suppliers?.[0]?.vendor?.name || "—",
  }
}

const CATEGORIES = [
  "All",
  "Plywood/Wood",
  "Laminates",
  "Hardware",
  "Tiles/Stone",
  "Paints",
  "Electrical",
  "Plumbing",
  "Glass",
  "Adhesives/Chemicals",
]

const STATUS_OPTIONS = ["All", "In Stock", "Low Stock", "Out of Stock"]

function getStockStatus(stock: number, reorderLevel: number): string {
  if (stock === 0) return "Out of Stock"
  if (stock < reorderLevel) return "Low Stock"
  return "In Stock"
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "In Stock") return "default"
  if (status === "Low Stock") return "secondary"
  return "destructive"
}

function getStatusClasses(status: string): string {
  if (status === "In Stock") return "bg-green-100 text-green-700 hover:bg-green-100"
  if (status === "Low Stock") return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
  return "bg-red-100 text-red-700 hover:bg-red-100"
}

function getCategoryClasses(category: string): string {
  const map: Record<string, string> = {
    "Plywood/Wood": "bg-amber-50 text-amber-700 hover:bg-amber-50",
    "Laminates": "bg-purple-50 text-purple-700 hover:bg-purple-50",
    "Hardware": "bg-slate-100 text-slate-700 hover:bg-slate-100",
    "Tiles/Stone": "bg-stone-100 text-stone-700 hover:bg-stone-100",
    "Paints": "bg-pink-50 text-pink-700 hover:bg-pink-50",
    "Electrical": "bg-blue-50 text-blue-700 hover:bg-blue-50",
    "Plumbing": "bg-cyan-50 text-cyan-700 hover:bg-cyan-50",
    "Glass": "bg-sky-50 text-sky-700 hover:bg-sky-50",
    "Adhesives/Chemicals": "bg-orange-50 text-orange-700 hover:bg-orange-50",
  }
  return map[category] || "bg-gray-100 text-gray-700"
}

export default function MaterialPlanningPage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [status, setStatus] = useState("All")
  const [showIndentForm, setShowIndentForm] = useState(false)
  const [reorderRequested, setReorderRequested] = useState<Set<string>>(new Set())

  // Indent form state
  const [indentMaterial, setIndentMaterial] = useState("")
  const [indentQty, setIndentQty] = useState("")
  const [indentProject, setIndentProject] = useState("")
  const [indentPriority, setIndentPriority] = useState("Medium")
  const [indentNotes, setIndentNotes] = useState("")

  // Fetch inventory items from API
  const { data: apiItems = [] } = useQuery<any[]>({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const res = await api.get("/inventory/items")
      return res.data.items ?? res.data ?? []
    },
  })

  const MATERIALS: MaterialItem[] = useMemo(
    () => apiItems.map(mapApiItem),
    [apiItems]
  )

  const filtered = useMemo(() => {
    return MATERIALS.filter((item) => {
      const matchesSearch =
        search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.preferredVendor.toLowerCase().includes(search.toLowerCase())

      const matchesCategory = category === "All" || item.category === category

      const itemStatus = getStockStatus(item.currentStock, item.reorderLevel)
      const matchesStatus = status === "All" || itemStatus === status

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [search, category, status, MATERIALS])

  const lowStockCount = MATERIALS.filter(
    (m) => m.currentStock > 0 && m.currentStock < m.reorderLevel
  ).length
  const outOfStockCount = MATERIALS.filter((m) => m.currentStock === 0).length
  const alertCount = lowStockCount + outOfStockCount

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Material Planning</h1>
            <p className="text-muted-foreground">
              Plan and track material requirements across projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const headers = ["Name", "Category", "Unit", "Current Stock", "Reorder Level", "Last Purchase Rate", "Preferred Vendor", "Status"]
              const rows = MATERIALS.map((m) => [m.name, m.category, m.unit, m.currentStock, m.reorderLevel, m.lastPurchaseRate, m.preferredVendor, getStockStatus(m.currentStock, m.reorderLevel)])
              exportCSV("material-plan.csv", headers, rows)
              toast({ title: "Export complete", description: "Material plan exported as CSV" })
            }}>
              <Download className="mr-2 h-4 w-4" />
              Export Plan
            </Button>
            <Button onClick={() => setShowIndentForm(!showIndentForm)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Indent
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items Tracked</p>
                <p className="text-2xl font-bold">{MATERIALS.length}</p>
                <p className="text-xs text-muted-foreground">Across {new Set(MATERIALS.map(m => m.category)).size} categories</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Alerts</p>
                <p className="text-2xl font-bold">{alertCount}</p>
                <p className="text-xs text-muted-foreground">Requires immediate reorder</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                <ClipboardList className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Indents</p>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Awaiting approval</p>
              </div>
            </div>
          </div>
        </div>

        {/* Indent Form */}
        {showIndentForm && (
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Create Material Indent</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowIndentForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Material</Label>
                <Select value={indentMaterial} onValueChange={setIndentMaterial}>
                  <SelectTrigger><SelectValue placeholder="Select material" /></SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((m) => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" placeholder="100" min="1" value={indentQty} onChange={(e) => setIndentQty(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={indentProject} onValueChange={setIndentProject}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Villa Renovation">Villa Renovation</SelectItem>
                    <SelectItem value="Modern Villa">Modern Villa</SelectItem>
                    <SelectItem value="Cozy 3BHK">Cozy 3BHK</SelectItem>
                    <SelectItem value="Luxury Duplex">Luxury Duplex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={indentPriority} onValueChange={setIndentPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" value={indentNotes} onChange={(e) => setIndentNotes(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => {
              if (!indentMaterial || !indentQty || !indentProject) { toast({ title: "Missing fields", description: "Please fill in material, quantity, and project." }); return }
              if (Number(indentQty) <= 0) { toast({ title: "Invalid", description: "Quantity must be a positive number" }); return }
              toast({ title: "Material indent created", description: `${indentQty} units of ${indentMaterial} for ${indentProject} (${indentPriority})` })
              setIndentMaterial(""); setIndentQty(""); setIndentProject(""); setIndentNotes(""); setShowIndentForm(false)
            }}>Submit Indent</Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search materials or vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Reorder Level</TableHead>
                <TableHead className="text-right">Last Purchase Rate</TableHead>
                <TableHead>Preferred Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    {MATERIALS.length === 0 ? "No materials tracked yet" : "No materials found matching your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => {
                  const itemStatus = getStockStatus(item.currentStock, item.reorderLevel)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getCategoryClasses(item.category)}>
                          {item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right font-medium">{item.currentStock}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.reorderLevel}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {"\u20B9"}{item.lastPurchaseRate.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.preferredVendor}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusClasses(itemStatus)}>
                          {itemStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={itemStatus !== "In Stock" ? "default" : "outline"}
                          className="h-8"
                          disabled={reorderRequested.has(item.id)}
                          onClick={() => {
                            setReorderRequested((prev) => new Set(prev).add(item.id))
                            toast({ title: "Reorder request submitted", description: `Reorder request submitted for ${item.name}` })
                          }}
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          {reorderRequested.has(item.id) ? "Requested" : "Reorder"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </RoleGuard>
  )
}

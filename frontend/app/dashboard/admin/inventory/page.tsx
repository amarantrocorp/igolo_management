"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Item, Vendor, VendorItem, StockTransaction } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  Search,
  Loader2,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Truck,
  X,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { useToast } from "@/components/ui/use-toast"
import { cn, formatCurrency } from "@/lib/utils"
import { PageHeader } from "@/components/layout/page-header"

const itemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  base_price: z.coerce.number().min(0, "Base price must be positive"),
  selling_price: z.coerce.number().min(0, "Selling price must be positive"),
  current_stock: z.coerce.number().min(0, "Stock must be positive"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be positive"),
  image_url: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

const CATEGORIES = [
  "Plywood", "Tiles", "Hardware", "Paint", "Electrical",
  "Plumbing", "Adhesives", "Laminates", "Glass", "Fixtures", "Other",
]

const UNITS = ["sqft", "nos", "kg", "ltr", "rft", "bundle", "set", "box"]

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.category}</Badge>
    ),
  },
  {
    accessorKey: "unit",
    header: "Unit",
  },
  {
    accessorKey: "current_stock",
    header: "Stock",
    cell: ({ row }) => {
      const isLow = row.original.current_stock < row.original.reorder_level
      return (
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", isLow && "text-destructive")}>
            {row.original.current_stock}
          </span>
          {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
        </div>
      )
    },
  },
  {
    id: "suppliers",
    header: "Suppliers",
    cell: ({ row }) => {
      const count = row.original.supplier_count ?? 0
      return (
        <div className="flex items-center gap-1">
          <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{count}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "base_price",
    header: "Base Price",
    cell: ({ row }) => (
      <span>{formatCurrency(row.original.base_price)}</span>
    ),
  },
  {
    accessorKey: "selling_price",
    header: "Selling Price",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.selling_price)}
      </span>
    ),
  },
]

// ---------- Tabs for item detail dialog ----------

type DetailTab = "details" | "suppliers" | "history"

function DetailsTab({
  item,
  onSaved,
}: {
  item: Item
  onSaved: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item.name,
      category: item.category,
      unit: item.unit,
      base_price: item.base_price,
      selling_price: item.selling_price,
      current_stock: item.current_stock,
      reorder_level: item.reorder_level,
      image_url: item.image_url || "",
    },
  })

  const editMutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const { current_stock, ...payload } = data
      const response = await api.put(`/inventory/items/${item.id}`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      queryClient.invalidateQueries({ queryKey: ["item", item.id] })
      toast({ title: "Saved", description: "Item details updated." })
      onSaved()
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item.", variant: "destructive" })
    },
  })

  return (
    <form onSubmit={form.handleSubmit((data) => editMutation.mutate(data))}>
      <div className="grid gap-4 py-2">
        <FileUpload
          value={form.watch("image_url") || null}
          onChange={(url) => form.setValue("image_url", url || "")}
          category="items"
          accept="image/jpeg,image/png,image/webp"
          label="Item Image"
        />

        <div className="space-y-2">
          <Label>Item Name</Label>
          <Input {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <select
              value={form.watch("category")}
              onChange={(e) => form.setValue("category", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <select
              value={form.watch("unit")}
              onChange={(e) => form.setValue("unit", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Base Price</Label>
            <Input type="number" step="0.01" {...form.register("base_price")} />
          </div>
          <div className="space-y-2">
            <Label>Selling Price</Label>
            <Input type="number" step="0.01" {...form.register("selling_price")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Current Stock</Label>
            <Input type="number" disabled value={item.current_stock} />
            <p className="text-xs text-muted-foreground">Stock changes via PO receive / issue</p>
          </div>
          <div className="space-y-2">
            <Label>Reorder Level</Label>
            <Input type="number" {...form.register("reorder_level")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={editMutation.isPending}>
          {editMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}

function SuppliersTab({ item }: { item: Item }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [vendorId, setVendorId] = useState("")
  const [vendorPrice, setVendorPrice] = useState("")
  const [leadTime, setLeadTime] = useState("")

  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<VendorItem[]>({
    queryKey: ["item-suppliers", item.id],
    queryFn: async () => {
      const res = await api.get(`/inventory/items/${item.id}/suppliers`)
      return res.data
    },
  })

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const res = await api.get("/inventory/vendors")
      return res.data.items ?? res.data
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/inventory/items/${item.id}/suppliers`, {
        vendor_id: vendorId,
        vendor_price: parseFloat(vendorPrice),
        lead_time_days: leadTime ? parseInt(leadTime) : null,
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-suppliers", item.id] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setVendorId("")
      setVendorPrice("")
      setLeadTime("")
      toast({ title: "Supplier linked" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail || "Failed to link supplier.",
        variant: "destructive",
      })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (vendorItemId: string) => {
      await api.delete(`/inventory/items/${item.id}/suppliers/${vendorItemId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-suppliers", item.id] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      toast({ title: "Supplier removed" })
    },
  })

  // Filter out vendors already linked
  const linkedVendorIds = new Set(suppliers.map((s) => s.vendor_id))
  const availableVendors = vendors.filter((v) => !linkedVendorIds.has(v.id))

  return (
    <div className="space-y-4 py-2">
      {loadingSuppliers ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : suppliers.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Lead Time</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.vendor_name || s.vendor_id}</TableCell>
                <TableCell>{formatCurrency(s.vendor_price)}</TableCell>
                <TableCell>
                  {s.lead_time_days ? `${s.lead_time_days} days` : "--"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMutation.mutate(s.id)}
                    disabled={removeMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No suppliers linked yet.
        </p>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Add Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vendor</Label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="">Select vendor</option>
                {availableVendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendor Price</Label>
              <Input
                type="number"
                step="0.01"
                className="h-9"
                placeholder="0.00"
                value={vendorPrice}
                onChange={(e) => setVendorPrice(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lead Time (days)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  className="h-9"
                  placeholder="--"
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-9"
                  disabled={!vendorId || !vendorPrice || addMutation.isPending}
                  onClick={() => addMutation.mutate()}
                >
                  {addMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StockHistoryTab({ item }: { item: Item }) {
  const { data: transactions = [], isLoading } = useQuery<StockTransaction[]>({
    queryKey: ["item-stock-history", item.id],
    queryFn: async () => {
      const res = await api.get(`/inventory/items/${item.id}/stock-history`)
      return res.data
    },
  })

  if (isLoading) {
    return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No stock transactions yet.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Qty</TableHead>
          <TableHead>Unit Cost</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => {
          const isPositive = t.quantity > 0
          return (
            <TableRow key={t.id}>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </TableCell>
              <TableCell>
                <Badge
                  variant={t.transaction_type === "PURCHASE_IN" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {t.transaction_type.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <ArrowDownLeft className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 text-red-600" />
                  )}
                  <span className={cn("font-medium", isPositive ? "text-green-600" : "text-red-600")}>
                    {isPositive ? "+" : ""}{t.quantity}
                  </span>
                </div>
              </TableCell>
              <TableCell>{formatCurrency(t.unit_cost_at_time)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {t.notes || "--"}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

// ---------- Main page ----------

export default function InventoryPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>("details")
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [showLowStock, setShowLowStock] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const response = await api.get("/inventory/items")
      return response.data.items ?? response.data
    },
  })

  const createForm = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      category: "",
      unit: "nos",
      base_price: 0,
      selling_price: 0,
      current_stock: 0,
      reorder_level: 10,
      image_url: "",
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const response = await api.post("/inventory/items", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setCreateOpen(false)
      createForm.reset()
      toast({ title: "Item added", description: "Inventory item created successfully." })
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create item.", variant: "destructive" })
    },
  })

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (showLowStock && item.current_stock >= item.reorder_level) return false
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false
      return true
    })
  }, [items, showLowStock, categoryFilter])

  const allColumns = useMemo<ColumnDef<Item>[]>(
    () => [
      ...columns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(row.original)
              setActiveTab("details")
            }}
          >
            View / Edit
          </Button>
        ),
      },
    ],
    []
  )

  const table = useReactTable({
    data: filteredItems,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter, columnFilters },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    initialState: { pagination: { pageSize: 10 } },
  })

  const lowStockCount = useMemo(
    () => items.filter((item) => item.current_stock < item.reorder_level).length,
    [items]
  )

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={Package}
          title="Inventory"
          subtitle="Manage inventory items, stock levels, and pricing"
          gradient="linear-gradient(135deg, #06B6D4, #0891B2)"
          action={
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>
                  Add a new item to the inventory master list.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}>
                <div className="grid gap-4 py-4">
                  <FileUpload
                    value={createForm.watch("image_url") || null}
                    onChange={(url) => createForm.setValue("image_url", url || "")}
                    category="items"
                    accept="image/jpeg,image/png,image/webp"
                    label="Item Image"
                  />

                  <div className="space-y-2">
                    <Label>Item Name</Label>
                    <Input placeholder="Plywood 18mm BWR" {...createForm.register("name")} />
                    {createForm.formState.errors.name && (
                      <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select
                        value={createForm.watch("category")}
                        onChange={(e) => createForm.setValue("category", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="" disabled>Select category</option>
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      {createForm.formState.errors.category && (
                        <p className="text-xs text-destructive">{createForm.formState.errors.category.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <select
                        value={createForm.watch("unit")}
                        onChange={(e) => createForm.setValue("unit", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Base Price</Label>
                      <Input type="number" step="0.01" {...createForm.register("base_price")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price</Label>
                      <Input type="number" step="0.01" {...createForm.register("selling_price")} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current Stock</Label>
                      <Input type="number" {...createForm.register("current_stock")} />
                    </div>
                    <div className="space-y-2">
                      <Label>Reorder Level</Label>
                      <Input type="number" {...createForm.register("reorder_level")} />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Item
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          }
        />

        {lowStockCount > 0 && (
          <div className="flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {lowStockCount} item(s) below reorder level
              </p>
              <p className="text-xs text-muted-foreground">
                Consider generating purchase orders for low-stock items
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowLowStock(!showLowStock)}>
              {showLowStock ? "Show All" : "Show Low Stock"}
            </Button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => {
                  const isLow = row.original.current_stock < row.original.reorder_level
                  return (
                    <TableRow key={row.id} className={cn(isLow && "bg-destructive/5")}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No inventory items found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {filteredItems.length} item(s)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Item Detail Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => { if (!open) setSelectedItem(null) }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start gap-4">
                {selectedItem?.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="h-16 w-16 rounded-md object-cover border shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-muted shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedItem?.name}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedItem?.category} &middot; {selectedItem?.unit} &middot; Stock: {selectedItem?.current_stock}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Tab navigation */}
            <div className="flex gap-1 border-b">
              {(["details", "suppliers", "history"] as DetailTab[]).map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "details" && "Details"}
                  {tab === "suppliers" && "Suppliers"}
                  {tab === "history" && "Stock History"}
                </button>
              ))}
            </div>

            {selectedItem && activeTab === "details" && (
              <DetailsTab
                key={selectedItem.id}
                item={selectedItem}
                onSaved={() => {
                  // Refresh the selected item from the list on next render
                }}
              />
            )}
            {selectedItem && activeTab === "suppliers" && (
              <SuppliersTab key={selectedItem.id} item={selectedItem} />
            )}
            {selectedItem && activeTab === "history" && (
              <StockHistoryTab key={selectedItem.id} item={selectedItem} />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  )
}

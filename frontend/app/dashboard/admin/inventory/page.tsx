"use client"

import { useState } from "react"
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
import type { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Search,
  Loader2,
  Package,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const createItemSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  base_price: z.coerce.number().min(0, "Base price must be positive"),
  selling_price: z.coerce.number().min(0, "Selling price must be positive"),
  current_stock: z.coerce.number().min(0, "Stock must be positive"),
  reorder_level: z.coerce.number().min(0, "Reorder level must be positive"),
})

type CreateItemFormValues = z.infer<typeof createItemSchema>

const CATEGORIES = [
  "Plywood",
  "Tiles",
  "Hardware",
  "Paint",
  "Electrical",
  "Plumbing",
  "Adhesives",
  "Laminates",
  "Glass",
  "Fixtures",
  "Other",
]

const UNITS = ["sqft", "nos", "kg", "ltr", "rft", "bundle", "set", "box"]

export default function InventoryPage() {
  const [open, setOpen] = useState(false)
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

  const createMutation = useMutation({
    mutationFn: async (data: CreateItemFormValues) => {
      const response = await api.post("/inventory/items", data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
      setOpen(false)
      form.reset()
      toast({ title: "Item added", description: "Inventory item created successfully." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create item. Please try again.",
        variant: "destructive",
      })
    },
  })

  const form = useForm<CreateItemFormValues>({
    resolver: zodResolver(createItemSchema),
    defaultValues: {
      name: "",
      category: "",
      unit: "nos",
      base_price: 0,
      selling_price: 0,
      current_stock: 0,
      reorder_level: 10,
    },
  })

  const filteredItems = items.filter((item) => {
    if (showLowStock && item.current_stock >= item.reorder_level) return false
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false
    return true
  })

  const columns: ColumnDef<Item>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.original.name}</span>
        </div>
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
            <span
              className={cn(
                "font-medium",
                isLow && "text-destructive"
              )}
            >
              {row.original.current_stock}
            </span>
            {isLow && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        )
      },
    },
    {
      accessorKey: "reorder_level",
      header: "Reorder Level",
    },
    {
      accessorKey: "base_price",
      header: "Base Price",
      cell: ({ row }) => (
        <span>₹{row.original.base_price.toLocaleString()}</span>
      ),
    },
    {
      accessorKey: "selling_price",
      header: "Selling Price",
      cell: ({ row }) => (
        <span className="font-medium">
          ₹{row.original.selling_price.toLocaleString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast({
              title: "Edit item",
              description: `Editing ${row.original.name} is not yet implemented.`,
            })
          }}
        >
          Edit
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: filteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
      columnFilters,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  const lowStockCount = items.filter(
    (item) => item.current_stock < item.reorder_level
  ).length

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Package className="h-6 w-6" />
              Inventory
            </h2>
            <p className="text-muted-foreground">
              Manage inventory items, stock levels, and pricing
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
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
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name</Label>
                    <Input
                      id="name"
                      placeholder="Plywood 18mm BWR"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={form.watch("category")}
                        onValueChange={(value) => form.setValue("category", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.category && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.category.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select
                        value={form.watch("unit")}
                        onValueChange={(value) => form.setValue("unit", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_price">Base Price (₹)</Label>
                      <Input
                        id="base_price"
                        type="number"
                        step="0.01"
                        {...form.register("base_price")}
                      />
                      {form.formState.errors.base_price && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.base_price.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="selling_price">Selling Price (₹)</Label>
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        {...form.register("selling_price")}
                      />
                      {form.formState.errors.selling_price && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.selling_price.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_stock">Current Stock</Label>
                      <Input
                        id="current_stock"
                        type="number"
                        {...form.register("current_stock")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reorder_level">Reorder Level</Label>
                      <Input
                        id="reorder_level"
                        type="number"
                        {...form.register("reorder_level")}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Item
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLowStock(!showLowStock)}
            >
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

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => {
                  const isLow =
                    row.original.current_stock < row.original.reorder_level
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(isLow && "bg-destructive/5")}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
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
            Showing {table.getRowModel().rows.length} of{" "}
            {filteredItems.length} item(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

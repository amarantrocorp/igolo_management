"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import type { BOMItem, BOMStatus, Item, Vendor } from "@/types"
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
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Link as LinkIcon, ShoppingCart, Package } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

// ---- Status badge helper ----

function getBOMStatusBadge(status: BOMStatus) {
  switch (status) {
    case "IN_STOCK":
    case "FULFILLED":
      return <Badge variant="success">{status.replace("_", " ")}</Badge>
    case "ORDERED":
    case "PARTIALLY_FULFILLED":
      return <Badge variant="warning">{status.replace("_", " ")}</Badge>
    case "PENDING":
      return <Badge variant="destructive">Pending</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ---- Link Inventory Dialog ----

function LinkInventoryDialog({
  open,
  onOpenChange,
  bomItem,
  projectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bomItem: BOMItem | null
  projectId: string
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState("")

  const { data: inventoryItems = [], isLoading } = useQuery<Item[]>({
    queryKey: ["inventory-search", search],
    queryFn: async () => {
      const res = await api.get("/inventory/items", { params: { search } })
      return res.data?.items ?? res.data ?? []
    },
    enabled: open && search.length >= 2,
  })

  const linkMutation = useMutation({
    mutationFn: async (inventoryItemId: string) => {
      return (
        await api.patch(`/projects/${projectId}/bom/${bomItem?.id}`, {
          inventory_item_id: inventoryItemId,
        })
      ).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-bom", projectId] })
      toast({ title: "Inventory linked", description: "BOM item linked to inventory successfully." })
      onOpenChange(false)
      setSearch("")
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail ?? "Failed to link inventory item.",
        variant: "destructive",
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link Inventory Item</DialogTitle>
          <DialogDescription>
            Search and select an inventory item to link to &quot;{bomItem?.description}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inv-search">Search Inventory</Label>
            <Input
              id="inv-search"
              placeholder="Type at least 2 characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isLoading && inventoryItems.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-md border">
              {inventoryItems.map((item) => (
                <button
                  key={item.id}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-muted/50 border-b last:border-b-0"
                  onClick={() => linkMutation.mutate(item.id)}
                  disabled={linkMutation.isPending}
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.category} &middot; Stock: {item.current_stock} {item.unit}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.base_price?.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!isLoading && search.length >= 2 && inventoryItems.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No inventory items found.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Create PO Dialog ----

function CreatePODialog({
  open,
  onOpenChange,
  bomItem,
  projectId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bomItem: BOMItem | null
  projectId: string
}) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [vendorId, setVendorId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unitPrice, setUnitPrice] = useState("")

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["vendors-list"],
    queryFn: async () => {
      const res = await api.get("/inventory/vendors")
      return res.data?.items ?? res.data ?? []
    },
    enabled: open,
  })

  const createPOMutation = useMutation({
    mutationFn: async () => {
      return (
        await api.post(`/projects/${projectId}/bom/${bomItem?.id}/create-po`, {
          vendor_id: vendorId,
          quantity: Number(quantity),
          unit_price: Number(unitPrice),
        })
      ).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-bom", projectId] })
      toast({ title: "Purchase Order created", description: "PO has been created for this BOM item." })
      onOpenChange(false)
      setVendorId("")
      setQuantity("")
      setUnitPrice("")
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail ?? "Failed to create purchase order.",
        variant: "destructive",
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
          <DialogDescription>
            Create a PO for &quot;{bomItem?.description}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Vendor</Label>
            {vendorsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading vendors...
              </div>
            ) : (
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po-qty">Quantity</Label>
              <Input
                id="po-qty"
                type="number"
                min={1}
                placeholder="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="po-price">Unit Price</Label>
              <Input
                id="po-price"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createPOMutation.mutate()}
            disabled={!vendorId || !quantity || !unitPrice || createPOMutation.isPending}
          >
            {createPOMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create PO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main BOM Tab ----

export default function BOMTab({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [poDialogOpen, setPODialogOpen] = useState(false)
  const [selectedBOM, setSelectedBOM] = useState<BOMItem | null>(null)

  const {
    data: bomItems = [],
    isLoading,
    isError,
  } = useQuery<BOMItem[]>({
    queryKey: ["project-bom", projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/bom`)
      return res.data?.items ?? res.data ?? []
    },
  })

  const issueStockMutation = useMutation({
    mutationFn: async (item: BOMItem) => {
      if (!item.inventory_item_id) throw new Error("No inventory item linked")
      return (
        await api.post(`/inventory/items/${item.inventory_item_id}/issue`, {
          project_id: projectId,
          quantity: item.quantity_required - item.quantity_issued,
        })
      ).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-bom", projectId] })
      toast({ title: "Stock issued", description: "Materials have been issued from inventory." })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.detail ?? "Failed to issue stock.",
        variant: "destructive",
      })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Failed to load BOM data.
      </div>
    )
  }

  // Summary calculations
  const totalItems = bomItems.length
  const inStock = bomItems.filter(
    (i) => i.status === "IN_STOCK"
  ).length
  const needsOrdering = bomItems.filter(
    (i) => i.status === "PENDING"
  ).length
  const fulfilled = bomItems.filter(
    (i) => i.status === "FULFILLED"
  ).length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{inStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Ordering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{needsOrdering}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fulfilled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fulfilled}</p>
          </CardContent>
        </Card>
      </div>

      {/* BOM Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials</CardTitle>
        </CardHeader>
        <CardContent>
          {bomItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No BOM items found for this project.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty Required</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Issued</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.description}
                        {item.inventory_item_name && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({item.inventory_item_name})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity_required} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity_in_stock}</TableCell>
                      <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                      <TableCell className="text-right">{item.quantity_issued}</TableCell>
                      <TableCell className="text-right">
                        {item.estimated_unit_cost.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </TableCell>
                      <TableCell>{getBOMStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Link Inventory"
                            onClick={() => {
                              setSelectedBOM(item)
                              setLinkDialogOpen(true)
                            }}
                          >
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Create PO"
                            onClick={() => {
                              setSelectedBOM(item)
                              setPODialogOpen(true)
                            }}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          {item.inventory_item_id &&
                            item.quantity_issued < item.quantity_required && (
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Issue Stock"
                                onClick={() => issueStockMutation.mutate(item)}
                                disabled={issueStockMutation.isPending}
                              >
                                {issueStockMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Package className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LinkInventoryDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        bomItem={selectedBOM}
        projectId={projectId}
      />
      <CreatePODialog
        open={poDialogOpen}
        onOpenChange={setPODialogOpen}
        bomItem={selectedBOM}
        projectId={projectId}
      />
    </div>
  )
}

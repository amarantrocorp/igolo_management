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
} from "@tanstack/react-table"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type { Vendor } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Store,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const vendorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact_person: z.string().min(2, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
})

type VendorFormValues = z.infer<typeof vendorSchema>

const columns: ColumnDef<Vendor>[] = [
  {
    accessorKey: "name",
    header: "Vendor Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {row.original.name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "contact_person",
    header: "Contact Person",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.contact_person || "--"}
      </span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.phone || "--"}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.email || "--"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Added",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString()
          : "--"}
      </span>
    ),
  },
]

export default function VendorsPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [globalFilter, setGlobalFilter] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await api.get("/inventory/vendors")
      return response.data.items ?? response.data
    },
  })

  const createForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      gst_number: "",
    },
  })

  const editForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
  })

  const createMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const response = await api.post("/inventory/vendors", {
        name: data.name,
        contact_person: data.contact_person,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        gst_number: data.gst_number || null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      setCreateOpen(false)
      createForm.reset()
      toast({ title: "Vendor added", description: "New vendor created successfully." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create vendor. Please try again.",
        variant: "destructive",
      })
    },
  })

  const editMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const response = await api.put(`/inventory/vendors/${editVendor!.id}`, {
        name: data.name,
        contact_person: data.contact_person,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        gst_number: data.gst_number || null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      setEditVendor(null)
      toast({ title: "Vendor updated", description: "Vendor details saved." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vendor. Please try again.",
        variant: "destructive",
      })
    },
  })

  const allColumns = useMemo<ColumnDef<Vendor>[]>(
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
              const v = row.original
              editForm.reset({
                name: v.name,
                contact_person: v.contact_person || "",
                phone: v.phone || "",
                email: v.email || "",
                address: v.address || "",
                gst_number: v.gst_number || "",
              })
              setEditVendor(v)
            }}
          >
            <Pencil className="mr-1 h-3 w-3" />
            Edit
          </Button>
        ),
      },
    ],
    [editForm]
  )

  const table = useReactTable({
    data: vendors,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageSize: 10 },
    },
  })

  function VendorFormFields({ form: f, isPending, onSubmit, onCancel, submitLabel }: {
    form: ReturnType<typeof useForm<VendorFormValues>>
    isPending: boolean
    onSubmit: (data: VendorFormValues) => void
    onCancel: () => void
    submitLabel: string
  }) {
    return (
      <form onSubmit={f.handleSubmit(onSubmit)}>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Vendor / Company Name</Label>
            <Input placeholder="ABC Plywood Supplies" {...f.register("name")} />
            {f.formState.errors.name && (
              <p className="text-xs text-destructive">{f.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Contact Person</Label>
            <Input placeholder="Rajesh Kumar" {...f.register("contact_person")} />
            {f.formState.errors.contact_person && (
              <p className="text-xs text-destructive">{f.formState.errors.contact_person.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+91 9876543210" {...f.register("phone")} />
              {f.formState.errors.phone && (
                <p className="text-xs text-destructive">{f.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input type="email" placeholder="vendor@example.com" {...f.register("email")} />
              {f.formState.errors.email && (
                <p className="text-xs text-destructive">{f.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>GST Number (Optional)</Label>
            <Input placeholder="22AAAAA0000A1Z5" {...f.register("gst_number")} />
          </div>

          <div className="space-y-2">
            <Label>Address (Optional)</Label>
            <Input placeholder="123 Industrial Area, City" {...f.register("address")} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    )
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Store className="h-6 w-6" />
              Vendors
            </h2>
            <p className="text-muted-foreground">
              Manage vendor directory and contact information
            </p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vendor</DialogTitle>
                <DialogDescription>
                  Add a new supplier or vendor to the system.
                </DialogDescription>
              </DialogHeader>
              <VendorFormFields
                form={createForm}
                isPending={createMutation.isPending}
                onSubmit={(data) => createMutation.mutate(data)}
                onCancel={() => setCreateOpen(false)}
                submitLabel="Add Vendor"
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editVendor} onOpenChange={(open) => { if (!open) setEditVendor(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Vendor</DialogTitle>
              <DialogDescription>
                Update vendor details.
              </DialogDescription>
            </DialogHeader>
            <VendorFormFields
              form={editForm}
              isPending={editMutation.isPending}
              onSubmit={(data) => editMutation.mutate(data)}
              onCancel={() => setEditVendor(null)}
              submitLabel="Save Changes"
            />
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
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
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={allColumns.length} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Store className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No vendors found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} vendor(s) total
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

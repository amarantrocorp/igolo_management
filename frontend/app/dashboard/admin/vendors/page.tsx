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
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

const createVendorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact_person: z.string().min(2, "Contact person is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  address: z.string().optional(),
})

type CreateVendorFormValues = z.infer<typeof createVendorSchema>

interface VendorExtended extends Vendor {
  contact_person?: string
  phone?: string
  email?: string
  address?: string
}

export default function VendorsPage() {
  const [open, setOpen] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: vendors = [], isLoading } = useQuery<VendorExtended[]>({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await api.get("/inventory/vendors")
      return response.data.items ?? response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateVendorFormValues) => {
      const response = await api.post("/inventory/vendors", {
        name: data.name,
        contact_info: `${data.contact_person} | ${data.phone}${data.email ? ` | ${data.email}` : ""}`,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] })
      setOpen(false)
      form.reset()
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

  const form = useForm<CreateVendorFormValues>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    },
  })

  const columns: ColumnDef<VendorExtended>[] = [
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
      accessorKey: "contact_info",
      header: "Contact Info",
      cell: ({ row }) => {
        const info = row.original.contact_info || ""
        const parts = info.split(" | ")
        return (
          <div className="space-y-0.5">
            {parts[0] && (
              <p className="text-sm">{parts[0]}</p>
            )}
            {parts[1] && (
              <p className="text-xs text-muted-foreground">{parts[1]}</p>
            )}
          </div>
        )
      },
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }) => {
        const info = row.original.contact_info || ""
        const parts = info.split(" | ")
        return parts[2] ? (
          <span className="text-sm">{parts[2]}</span>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )
      },
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
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toast({
              title: "Edit vendor",
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
    data: vendors,
    columns,
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

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
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

          <Dialog open={open} onOpenChange={setOpen}>
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
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor_name">Vendor / Company Name</Label>
                    <Input
                      id="vendor_name"
                      placeholder="ABC Plywood Supplies"
                      {...form.register("name")}
                    />
                    {form.formState.errors.name && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      placeholder="Rajesh Kumar"
                      {...form.register("contact_person")}
                    />
                    {form.formState.errors.contact_person && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.contact_person.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="+91 9876543210"
                        {...form.register("phone")}
                      />
                      {form.formState.errors.phone && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vendor_email">Email (Optional)</Label>
                      <Input
                        id="vendor_email"
                        type="email"
                        placeholder="vendor@example.com"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address (Optional)</Label>
                    <Input
                      id="address"
                      placeholder="123 Industrial Area, City"
                      {...form.register("address")}
                    />
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
                    Add Vendor
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
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
                  <TableCell colSpan={columns.length} className="h-24 text-center">
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

"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { FileUpload } from "@/components/ui/file-upload"
import { useAuthStore } from "@/store/auth-store"
import type { Sprint, VariationOrder } from "@/types"

const VO_STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-blue-100 text-blue-700",
}

const formatCurrencyINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount)

const createVOSchema = z.object({
  description: z.string().min(1, "Description is required"),
  additional_cost: z.coerce.number().min(1, "Cost must be greater than 0"),
  linked_sprint_id: z.string().optional(),
  supporting_doc_url: z.string().nullable().optional(),
})

type CreateVOForm = z.infer<typeof createVOSchema>

export default function VariationOrdersTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const roleInOrg = useAuthStore((s) => s.roleInOrg)
  const isManagerOrAdmin =
    roleInOrg === "MANAGER" || roleInOrg === "SUPER_ADMIN"

  // --- Query ---

  const { data: vos = [], isLoading } = useQuery<VariationOrder[]>({
    queryKey: ["project-vos", projectId],
    queryFn: async () => {
      const res = await api.get(
        `/projects/${projectId}/variation-orders`,
      )
      return res.data.items ?? res.data
    },
  })

  // --- Mutations ---

  const createVOMutation = useMutation({
    mutationFn: async (data: CreateVOForm) => {
      const payload = {
        description: data.description,
        additional_cost: data.additional_cost,
        linked_sprint_id: data.linked_sprint_id || null,
        supporting_doc_url: data.supporting_doc_url || null,
      }
      const res = await api.post(
        `/projects/${projectId}/variation-orders`,
        payload,
      )
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-vos", projectId] })
      setCreateOpen(false)
      form.reset()
      toast({
        title: "Variation order created",
        description: "New VO has been submitted.",
      })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.detail ||
          "Failed to create variation order.",
        variant: "destructive",
      })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      voId,
      status,
    }: {
      voId: string
      status: string
    }) => {
      await api.patch(
        `/projects/${projectId}/variation-orders/${voId}`,
        { status },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-vos", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({ title: "Variation order updated" })
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err?.response?.data?.detail ||
          "Failed to update variation order.",
        variant: "destructive",
      })
    },
  })

  // --- Form ---

  const form = useForm<CreateVOForm>({
    resolver: zodResolver(createVOSchema),
    defaultValues: {
      description: "",
      additional_cost: 0,
      linked_sprint_id: undefined,
      supporting_doc_url: null,
    },
  })

  function getSprintName(sprintId?: string): string {
    if (!sprintId) return "-"
    const sprint = sprints.find((s) => s.id === sprintId)
    return sprint?.name ?? "-"
  }

  // --- Render ---

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Variation Orders</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          New Variation Order
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : vos.length === 0 ? (
        <div className="rounded-xl border bg-white p-5 text-center">
          <p className="text-muted-foreground">No variation orders</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Cost
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Sprint
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {vos.map((vo) => (
                <tr key={vo.id} className="border-b last:border-0">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate">{vo.description}</p>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {formatCurrencyINR(vo.additional_cost)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={VO_STATUS_COLORS[vo.status]}>
                      {vo.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {getSprintName(vo.linked_sprint_id)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(vo.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {vo.status === "REQUESTED" && isManagerOrAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={updateStatusMutation.isPending}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                voId: vo.id,
                                status: "APPROVED",
                              })
                            }
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-green-600" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={updateStatusMutation.isPending}
                            onClick={() =>
                              updateStatusMutation.mutate({
                                voId: vo.id,
                                status: "REJECTED",
                              })
                            }
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5 text-red-600" />
                            Reject
                          </Button>
                        </>
                      )}
                      {vo.status === "APPROVED" && isManagerOrAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updateStatusMutation.isPending}
                          onClick={() =>
                            updateStatusMutation.mutate({
                              voId: vo.id,
                              status: "PAID",
                            })
                          }
                        >
                          {updateStatusMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Mark Paid"
                          )}
                        </Button>
                      )}
                      {!["REQUESTED", "APPROVED"].includes(vo.status) && (
                        <span className="text-xs text-muted-foreground">
                          --
                        </span>
                      )}
                      {["REQUESTED", "APPROVED"].includes(vo.status) &&
                        !isManagerOrAdmin && (
                          <span className="text-xs text-muted-foreground">
                            Pending
                          </span>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create VO Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Variation Order</DialogTitle>
            <DialogDescription>
              Submit a change request for additional work or scope changes.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((data) =>
              createVOMutation.mutate(data),
            )}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the variation or additional work..."
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Additional Cost *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      &#x20B9;
                    </span>
                    <Input
                      type="number"
                      placeholder="15000"
                      className="pl-7"
                      {...form.register("additional_cost")}
                    />
                  </div>
                  {form.formState.errors.additional_cost && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.additional_cost.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Linked Sprint (optional)</Label>
                  <Select
                    value={form.watch("linked_sprint_id") ?? ""}
                    onValueChange={(v) =>
                      form.setValue(
                        "linked_sprint_id",
                        v === "none" ? undefined : v,
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {sprints.map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>
                          {sp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <FileUpload
                value={form.watch("supporting_doc_url")}
                onChange={(url) => form.setValue("supporting_doc_url", url)}
                category="variation-orders"
                label="Supporting Document (optional)"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createVOMutation.isPending}>
                {createVOMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit VO
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

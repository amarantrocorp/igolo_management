"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import type {
  Project,
  Sprint,
  SprintStatus,
  Transaction,
  DailyLog,
  VariationOrder,
  ProjectWallet,
  VOStatus,
  AttendanceLog,
  LaborTeam,
  AttendanceStatus,
} from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  ArrowLeft,
  Loader2,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Image as ImageIcon,
  AlertCircle,
  HardHat,
  Users,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuthStore } from "@/store/auth-store"
import { cn, formatCurrency } from "@/lib/utils"

// ---- Sprint Status helpers ----

function getSprintStatusBadge(status: SprintStatus) {
  switch (status) {
    case "PENDING":
      return <Badge variant="secondary">Pending</Badge>
    case "ACTIVE":
      return <Badge variant="default">Active</Badge>
    case "COMPLETED":
      return <Badge variant="success">Completed</Badge>
    case "DELAYED":
      return <Badge variant="destructive">Delayed</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getVOStatusBadge(status: VOStatus) {
  switch (status) {
    case "REQUESTED":
      return <Badge variant="warning">Requested</Badge>
    case "APPROVED":
      return <Badge variant="default">Approved</Badge>
    case "REJECTED":
      return <Badge variant="destructive">Rejected</Badge>
    case "PAID":
      return <Badge variant="success">Paid</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

// ---- Schema for recording payment ----
const recordPaymentSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  source: z.enum(["CLIENT", "VENDOR", "LABOR", "PETTY_CASH"]),
  category: z.enum(["INFLOW", "OUTFLOW"]),
})

type RecordPaymentFormValues = z.infer<typeof recordPaymentSchema>

// ---- Schema for creating variation order ----
const createVOSchema = z.object({
  description: z.string().min(1, "Description is required"),
  additional_cost: z.coerce.number().min(0, "Cost must be positive"),
})

type CreateVOFormValues = z.infer<typeof createVOSchema>

// ---- Overview Tab ----

function OverviewTab({
  project,
  projectId,
}: {
  project: Project
  projectId: string
}) {
  const totalValue = Number(project.total_project_value ?? 0)
  const received = Number(project.wallet?.total_received ?? 0)
  const spent = Number(project.wallet?.total_spent ?? 0)
  const balance = received - spent
  const completedSprints =
    project.sprints?.filter((s) => s.status === "COMPLETED").length ?? 0
  const totalSprints = project.sprints?.length ?? 6
  const progressPercent = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : 0

  // Fetch labor cost breakdown from transactions
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["project-transactions", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/transactions`)
      return response.data.items ?? response.data
    },
  })

  const laborCost = transactions
    .filter((t) => t.category === "OUTFLOW" && t.source === "LABOR")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  const materialCost = transactions
    .filter((t) => t.category === "OUTFLOW" && t.source === "VENDOR")
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  const otherCost = transactions
    .filter(
      (t) =>
        t.category === "OUTFLOW" &&
        t.source !== "LABOR" &&
        t.source !== "VENDOR"
    )
    .reduce((sum, t) => sum + Number(t.amount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                balance >= 0 ? "text-green-600" : "text-destructive"
              )}
            >
              {formatCurrency(balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Received - Spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.start_date
                ? format(new Date(project.start_date), "MMM d")
                : "TBD"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected End</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.expected_end_date
                ? format(new Date(project.expected_end_date), "MMM d")
                : "TBD"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progress</CardTitle>
          <CardDescription>
            {completedSprints} of {totalSprints} sprints completed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall Completion</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-secondary">
            <div
              className="h-3 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(received)}
              </p>
              <p className="text-xs text-muted-foreground">Received</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(spent)}
              </p>
              <p className="text-xs text-muted-foreground">Spent</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p
                className={cn(
                  "text-2xl font-bold",
                  balance >= 0 ? "text-blue-600" : "text-destructive"
                )}
              >
                {formatCurrency(Math.abs(balance))}
              </p>
              <p className="text-xs text-muted-foreground">
                {balance >= 0 ? "Available" : "Over Budget"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      {spent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Breakdown</CardTitle>
            <CardDescription>
              How expenses are distributed across categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <HardHat className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-muted-foreground">Labor</span>
                </div>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(laborCost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spent > 0 ? Math.round((laborCost / spent) * 100) : 0}% of spend
                </p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-muted-foreground">Materials</span>
                </div>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(materialCost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spent > 0 ? Math.round((materialCost / spent) * 100) : 0}% of spend
                </p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-muted-foreground">Other</span>
                </div>
                <p className="text-xl font-bold text-gray-600">
                  {formatCurrency(otherCost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {spent > 0 ? Math.round((otherCost / spent) * 100) : 0}% of spend
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---- Sprints Tab ----

function SprintsTab({
  sprints,
  projectId,
}: {
  sprints: Sprint[]
  projectId: string
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const updateSprintMutation = useMutation({
    mutationFn: async ({
      sprintId,
      status,
    }: {
      sprintId: string
      status: SprintStatus
    }) => {
      await api.patch(`/projects/${projectId}/sprints/${sprintId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({ title: "Sprint updated", description: "Sprint status has been updated." })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update sprint.",
        variant: "destructive",
      })
    },
  })

  const sortedSprints = [...sprints].sort(
    (a, b) => a.sequence_order - b.sequence_order
  )

  return (
    <div className="space-y-4">
      {sortedSprints.map((sprint) => {
        const startDate = sprint.start_date
          ? format(new Date(sprint.start_date), "MMM d, yyyy")
          : "TBD"
        const endDate = sprint.end_date
          ? format(new Date(sprint.end_date), "MMM d, yyyy")
          : "TBD"

        const now = new Date()
        const sprintEnd = sprint.end_date ? new Date(sprint.end_date) : null
        const sprintStart = sprint.start_date
          ? new Date(sprint.start_date)
          : null
        let progress = 0
        if (sprint.status === "COMPLETED") {
          progress = 100
        } else if (
          sprint.status === "ACTIVE" &&
          sprintStart &&
          sprintEnd
        ) {
          const total = sprintEnd.getTime() - sprintStart.getTime()
          const elapsed = now.getTime() - sprintStart.getTime()
          progress = total > 0 ? Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100) : 0
        }

        return (
          <Card
            key={sprint.id}
            className={cn(
              sprint.status === "ACTIVE" && "border-primary",
              sprint.status === "DELAYED" && "border-destructive"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                      sprint.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : sprint.status === "ACTIVE"
                        ? "bg-primary/10 text-primary"
                        : sprint.status === "DELAYED"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {sprint.sequence_order}
                  </div>
                  <div>
                    <p className="font-medium">{sprint.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {startDate} - {endDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getSprintStatusBadge(sprint.status)}
                  <Select
                    value={sprint.status}
                    onValueChange={(value) =>
                      updateSprintMutation.mutate({
                        sprintId: sprint.id,
                        status: value as SprintStatus,
                      })
                    }
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="DELAYED">Delayed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress bar */}
              {(sprint.status === "ACTIVE" ||
                sprint.status === "COMPLETED") && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        sprint.status === "COMPLETED"
                          ? "bg-green-500"
                          : "bg-primary"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {sprints.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No sprints found</p>
          <p className="text-xs text-muted-foreground">
            Sprints are auto-generated when a project is created
          </p>
        </div>
      )}
    </div>
  )
}

// ---- Finance Tab ----

const SOURCE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  INFLOW: [{ value: "CLIENT", label: "Client" }],
  OUTFLOW: [
    { value: "VENDOR", label: "Vendor" },
    { value: "LABOR", label: "Labor" },
    { value: "PETTY_CASH", label: "Petty Cash" },
  ],
}

function FinanceTab({ projectId }: { projectId: string }) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: wallet } = useQuery<ProjectWallet>({
    queryKey: ["project-wallet", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/financial-health`)
      return response.data
    },
  })

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["project-transactions", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/transactions`)
      return response.data.items ?? response.data
    },
  })

  const paymentForm = useForm<RecordPaymentFormValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      amount: 0,
      description: "",
      source: "CLIENT",
      category: "INFLOW",
    },
  })


  const paymentMutation = useMutation({
    mutationFn: async (data: RecordPaymentFormValues) => {
      await api.post(`/projects/${projectId}/transactions`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-wallet", projectId] })
      queryClient.invalidateQueries({
        queryKey: ["project-transactions", projectId],
      })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      setPaymentOpen(false)
      paymentForm.reset()
      toast({
        title: "Payment recorded",
        description: "Transaction has been recorded successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment.",
        variant: "destructive",
      })
    },
  })

  const totalReceived = Number(wallet?.total_received ?? 0)
  const totalSpent = Number(wallet?.total_spent ?? 0)
  const balance = Number(wallet?.current_balance ?? totalReceived - totalSpent)

  return (
    <div className="space-y-6">
      {/* Wallet Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Received
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceived)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSpent)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                balance >= 0 ? "text-blue-600" : "text-destructive"
              )}
            >
              {formatCurrency(Math.abs(balance))}
            </div>
            {balance < 0 && (
              <p className="text-xs text-destructive">Over budget</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Record Payment Button */}
      <div className="flex justify-end">
        <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>
                Record a payment in or expense out for this project.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={paymentForm.handleSubmit((data) =>
                paymentMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={paymentForm.watch("category")}
                      onValueChange={(v) => {
                        const cat = v as "INFLOW" | "OUTFLOW"
                        paymentForm.setValue("category", cat)
                        paymentForm.setValue(
                          "source",
                          SOURCE_OPTIONS[cat][0].value as "CLIENT" | "VENDOR" | "LABOR" | "PETTY_CASH"
                        )
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFLOW">Money In</SelectItem>
                        <SelectItem value="OUTFLOW">Money Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select
                      value={paymentForm.watch("source")}
                      onValueChange={(v) =>
                        paymentForm.setValue(
                          "source",
                          v as "CLIENT" | "VENDOR" | "LABOR" | "PETTY_CASH"
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS[paymentForm.watch("category")].map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_amount">Amount (₹)</Label>
                  <Input
                    id="payment_amount"
                    type="number"
                    step="0.01"
                    {...paymentForm.register("amount")}
                  />
                  {paymentForm.formState.errors.amount && (
                    <p className="text-xs text-destructive">
                      {paymentForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_desc">Description</Label>
                  <Input
                    id="payment_desc"
                    placeholder="e.g., Client advance payment"
                    {...paymentForm.register("description")}
                  />
                  {paymentForm.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {paymentForm.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaymentOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : transactions.length ? (
                  transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm">
                        {format(new Date(txn.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.category === "INFLOW" ? "success" : "destructive"
                          }
                        >
                          {txn.category === "INFLOW" ? "IN" : "OUT"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{txn.source}</TableCell>
                      <TableCell className="text-sm">
                        {txn.description}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium",
                          txn.category === "INFLOW"
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {txn.category === "INFLOW" ? "+" : "-"}
                        {formatCurrency(txn.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            txn.status === "CLEARED"
                              ? "success"
                              : txn.status === "REJECTED"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {txn.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <p className="text-muted-foreground">
                        No transactions recorded yet
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Daily Logs Tab ----

function DailyLogsTab({ projectId }: { projectId: string }) {
  const { data: logs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ["project-daily-logs", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/daily-logs`)
      return response.data.items ?? response.data
    },
  })

  return (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && logs.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No daily logs yet</p>
          <p className="text-xs text-muted-foreground">
            Supervisors can submit daily progress logs from the site
          </p>
        </div>
      )}

      {logs.map((log) => (
        <Card key={log.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {format(new Date(log.created_at), "EEEE, MMM d, yyyy")}
                  </p>
                  {log.visible_to_client && (
                    <Badge variant="outline" className="text-xs">
                      Visible to Client
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{log.notes}</p>

                {log.blockers && (
                  <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="text-xs font-medium text-destructive">
                        Blockers
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.blockers}
                      </p>
                    </div>
                  </div>
                )}

                {log.images && log.images.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {log.images.map((img, i) => (
                      <div
                        key={i}
                        className="h-16 w-16 rounded-md border bg-muted"
                      >
                        <img
                          src={img}
                          alt={`Site photo ${i + 1}`}
                          className="h-full w-full rounded-md object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---- Variation Orders Tab ----

function VariationOrdersTab({ projectId }: { projectId: string }) {
  const [voOpen, setVoOpen] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const userRole = useAuthStore((s) => s.user?.role)
  const canManageVO = ["SUPER_ADMIN", "MANAGER"].includes(userRole ?? "")

  const { data: vos = [], isLoading } = useQuery<VariationOrder[]>({
    queryKey: ["project-vos", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/variation-orders`)
      return response.data.items ?? response.data
    },
  })

  const voForm = useForm<CreateVOFormValues>({
    resolver: zodResolver(createVOSchema),
    defaultValues: {
      description: "",
      additional_cost: 0,
    },
  })

  const updateVOMutation = useMutation({
    mutationFn: async ({ voId, status }: { voId: string; status: VOStatus }) => {
      await api.patch(`/projects/${projectId}/variation-orders/${voId}`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-vos", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project-wallet", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      toast({
        title: "Variation order updated",
        description: "The VO status has been updated.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update variation order.",
        variant: "destructive",
      })
    },
  })

  const createVOMutation = useMutation({
    mutationFn: async (data: CreateVOFormValues) => {
      await api.post(`/projects/${projectId}/variation-orders`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-vos", projectId] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId] })
      setVoOpen(false)
      voForm.reset()
      toast({
        title: "Variation order created",
        description: "The VO has been submitted for approval.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create variation order.",
        variant: "destructive",
      })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={voOpen} onOpenChange={setVoOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create VO
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Variation Order</DialogTitle>
              <DialogDescription>
                Add a change request for additional work beyond the original
                scope.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={voForm.handleSubmit((data) =>
                createVOMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="vo_description">Description</Label>
                  <Input
                    id="vo_description"
                    placeholder="e.g., Additional false ceiling in guest room"
                    {...voForm.register("description")}
                  />
                  {voForm.formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {voForm.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vo_cost">Additional Cost (₹)</Label>
                  <Input
                    id="vo_cost"
                    type="number"
                    step="0.01"
                    {...voForm.register("additional_cost")}
                  />
                  {voForm.formState.errors.additional_cost && (
                    <p className="text-xs text-destructive">
                      {voForm.formState.errors.additional_cost.message}
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVoOpen(false)}
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

      {isLoading && (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && vos.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No variation orders</p>
          <p className="text-xs text-muted-foreground">
            Variation orders are created when additional scope is requested after
            contract signing
          </p>
        </div>
      )}

      <div className="rounded-md border">
        {vos.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VO ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Additional Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {canManageVO && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vos.map((vo) => (
                <TableRow key={vo.id}>
                  <TableCell className="font-mono text-xs">
                    VO-{vo.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-sm">{vo.description}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(vo.additional_cost)}
                  </TableCell>
                  <TableCell>{getVOStatusBadge(vo.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(vo.created_at), "MMM d, yyyy")}
                  </TableCell>
                  {canManageVO && (
                    <TableCell>
                      {vo.status === "REQUESTED" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            disabled={updateVOMutation.isPending}
                            onClick={() =>
                              updateVOMutation.mutate({ voId: vo.id, status: "APPROVED" })
                            }
                          >
                            {updateVOMutation.isPending && (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            disabled={updateVOMutation.isPending}
                            onClick={() =>
                              updateVOMutation.mutate({ voId: vo.id, status: "REJECTED" })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      {vo.status === "APPROVED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                          disabled={updateVOMutation.isPending}
                          onClick={() =>
                            updateVOMutation.mutate({ voId: vo.id, status: "PAID" })
                          }
                        >
                          {updateVOMutation.isPending && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          Mark as Paid
                        </Button>
                      )}
                      {(vo.status === "REJECTED" || vo.status === "PAID") && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ---- Labor Tab ----

const logAttendanceSchema = z.object({
  team_id: z.string().min(1, "Select a team"),
  sprint_id: z.string().min(1, "Select a sprint"),
  date: z.string().min(1, "Date is required"),
  workers_present: z.coerce.number().min(1, "At least 1 worker required"),
  total_hours: z.coerce.number().min(0.5, "Minimum 0.5 hours").max(24),
  notes: z.string().optional(),
})

type LogAttendanceFormValues = z.infer<typeof logAttendanceSchema>

function getAttendanceStatusBadge(status: AttendanceStatus) {
  switch (status) {
    case "PAID":
      return <Badge variant="success">Paid</Badge>
    case "APPROVED_BY_MANAGER":
      return <Badge variant="default">Approved</Badge>
    case "PENDING":
      return <Badge variant="warning">Pending</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function LaborTab({
  projectId,
  sprints,
}: {
  projectId: string
  sprints: Sprint[]
}) {
  const [logOpen, setLogOpen] = useState(false)
  const [sprintFilter, setSprintFilter] = useState<string>("all")
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: attendanceLogs = [], isLoading } = useQuery<AttendanceLog[]>({
    queryKey: ["project-attendance", projectId, sprintFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ project_id: projectId })
      if (sprintFilter !== "all") {
        params.set("sprint_id", sprintFilter)
      }
      const response = await api.get(`/labor/attendance?${params.toString()}`)
      return response.data.items ?? response.data
    },
  })

  const { data: teams = [] } = useQuery<LaborTeam[]>({
    queryKey: ["labor-teams"],
    queryFn: async () => {
      const response = await api.get("/labor/teams")
      return response.data.items ?? response.data
    },
  })

  const attendanceForm = useForm<LogAttendanceFormValues>({
    resolver: zodResolver(logAttendanceSchema),
    defaultValues: {
      team_id: "",
      sprint_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      workers_present: 1,
      total_hours: 8,
      notes: "",
    },
  })

  const logMutation = useMutation({
    mutationFn: async (data: LogAttendanceFormValues) => {
      await api.post("/labor/attendance", {
        project_id: projectId,
        ...data,
        notes: data.notes || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-attendance", projectId],
      })
      setLogOpen(false)
      attendanceForm.reset({
        team_id: "",
        sprint_id: "",
        date: format(new Date(), "yyyy-MM-dd"),
        workers_present: 1,
        total_hours: 8,
        notes: "",
      })
      toast({
        title: "Attendance logged",
        description: "Daily attendance has been recorded successfully.",
      })
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log attendance. Check inputs and try again.",
        variant: "destructive",
      })
    },
  })

  const activeSprint = sprints.find((s) => s.status === "ACTIVE")

  const teamMap = new Map(teams.map((t) => [t.id, t]))

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceLogs.length}</div>
            <p className="text-xs text-muted-foreground">Attendance records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                attendanceLogs.reduce(
                  (sum, log) => sum + Number(log.calculated_cost ?? 0),
                  0
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams Active</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(attendanceLogs.map((l) => l.team_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique teams logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Log Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Select value={sprintFilter} onValueChange={setSprintFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Sprints" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {[...sprints]
              .sort((a, b) => a.sequence_order - b.sequence_order)
              .map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Dialog open={logOpen} onOpenChange={setLogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Attendance
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Daily Attendance</DialogTitle>
              <DialogDescription>
                Record attendance for a labor team working on this project.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={attendanceForm.handleSubmit((data) =>
                logMutation.mutate(data)
              )}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Labor Team</Label>
                  <Select
                    value={attendanceForm.watch("team_id")}
                    onValueChange={(v) => attendanceForm.setValue("team_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.specialization})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {attendanceForm.formState.errors.team_id && (
                    <p className="text-xs text-destructive">
                      {attendanceForm.formState.errors.team_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sprint</Label>
                  <Select
                    value={attendanceForm.watch("sprint_id")}
                    onValueChange={(v) =>
                      attendanceForm.setValue("sprint_id", v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...sprints]
                        .sort((a, b) => a.sequence_order - b.sequence_order)
                        .map((sprint) => (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            {sprint.name}
                            {sprint.id === activeSprint?.id ? " (Active)" : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {attendanceForm.formState.errors.sprint_id && (
                    <p className="text-xs text-destructive">
                      {attendanceForm.formState.errors.sprint_id.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="att_date">Date</Label>
                    <Input
                      id="att_date"
                      type="date"
                      {...attendanceForm.register("date")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="att_workers">Workers</Label>
                    <Input
                      id="att_workers"
                      type="number"
                      min={1}
                      {...attendanceForm.register("workers_present")}
                    />
                    {attendanceForm.formState.errors.workers_present && (
                      <p className="text-xs text-destructive">
                        {attendanceForm.formState.errors.workers_present.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="att_hours">Hours</Label>
                    <Input
                      id="att_hours"
                      type="number"
                      step="0.5"
                      min={0.5}
                      max={24}
                      {...attendanceForm.register("total_hours")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="att_notes">Notes (optional)</Label>
                  <Input
                    id="att_notes"
                    placeholder="e.g., Completed wardrobe framing in master bedroom"
                    {...attendanceForm.register("notes")}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={logMutation.isPending}>
                  {logMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Log Attendance
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attendance Records</CardTitle>
          <CardDescription>
            Daily labor attendance logged for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Workers</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : attendanceLogs.length ? (
                  attendanceLogs.map((log) => {
                    const team = teamMap.get(log.team_id)
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">
                              {team?.name ?? log.team?.name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {team?.specialization ??
                                log.team?.specialization ??
                                ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{log.workers_present}</TableCell>
                        <TableCell>{log.total_hours}h</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(log.calculated_cost)}
                        </TableCell>
                        <TableCell>
                          {getAttendanceStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {log.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <HardHat className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          No attendance records for this project
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Click &quot;Log Attendance&quot; to record daily labor
                          attendance
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Main Page ----

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}`)
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    )
  }

  const clientName =
    project.client?.user?.full_name ??
    project.client?.lead?.name ??
    "Unknown Client"

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {clientName}&apos;s Project
              </h2>
              <Badge
                variant={
                  project.status === "IN_PROGRESS"
                    ? "default"
                    : project.status === "COMPLETED"
                    ? "success"
                    : project.status === "ON_HOLD"
                    ? "warning"
                    : "secondary"
                }
              >
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              PRJ-{project.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sprints">Sprints</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="daily-logs">Daily Logs</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="variation-orders">Variation Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab project={project} projectId={projectId} />
          </TabsContent>

          <TabsContent value="sprints">
            <SprintsTab
              sprints={project.sprints ?? []}
              projectId={projectId}
            />
          </TabsContent>

          <TabsContent value="finance">
            <FinanceTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="daily-logs">
            <DailyLogsTab projectId={projectId} />
          </TabsContent>

          <TabsContent value="labor">
            <LaborTab
              projectId={projectId}
              sprints={project.sprints ?? []}
            />
          </TabsContent>

          <TabsContent value="variation-orders">
            <VariationOrdersTab projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

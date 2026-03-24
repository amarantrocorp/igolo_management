"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { CreditCard, DollarSign, Loader2, Phone, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { PageHeader, MiniStatCard } from "@/components/layout/page-header"
import { useAuthStore } from "@/store/auth-store"
import RazorpayButton from "@/components/payments/razorpay-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Transaction {
  id: string
  project_id: string
  category: string
  source: string
  amount: number
  description: string
  status: string
  created_at: string
}

interface Project {
  id: string
  status: string
  total_project_value?: number
  client?: {
    lead?: { name?: string }
    address?: string
  }
}

interface Wallet {
  project_id: string
  total_agreed_value: number
  total_received: number
  total_spent: number
  current_balance: number
}

const RAZORPAY_CONFIGURED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_RAZORPAY_ENABLED === "true"

export default function ClientPaymentsPage() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [paymentAmount, setPaymentAmount] = useState<string>("")

  const { data: projects = [], isLoading: projectsLoading } = useQuery<
    Project[]
  >({
    queryKey: ["client-portal-projects"],
    queryFn: () => api.get("/projects").then((r) => r.data),
  })

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const response = await api.get("/finance/transactions")
      return response.data.items ?? response.data
    },
  })

  const { data: wallet } = useQuery<Wallet>({
    queryKey: ["project-wallet", selectedProjectId],
    queryFn: async () => {
      const response = await api.get(
        `/finance/projects/${selectedProjectId}/wallet`
      )
      return response.data
    },
    enabled: !!selectedProjectId,
  })

  const payments = transactions.filter(
    (t) => t.category === "INFLOW" && t.source === "CLIENT"
  )
  const totalPaid = payments
    .filter((p) => p.status === "CLEARED")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const projectName =
    selectedProject?.client?.lead?.name ?? "Project"
  const parsedAmount = parseFloat(paymentAmount)
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0

  const handlePaymentSuccess = () => {
    setPaymentAmount("")
    queryClient.invalidateQueries({ queryKey: ["client-payments"] })
    queryClient.invalidateQueries({
      queryKey: ["project-wallet", selectedProjectId],
    })
  }

  return (
    <RoleGuard allowedRoles={["CLIENT", "SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <PageHeader
          icon={CreditCard}
          title="Payments"
          subtitle="View your payment history and make new payments"
          gradient="linear-gradient(135deg, #CBB282, #A8956E)"
          action={
            <Button
              variant="outline"
              onClick={() => {
                toast({
                  title: "Contact your project manager",
                  description:
                    "To arrange a payment, please reach out to your project manager who will share bank transfer details or generate a payment link.",
                })
              }}
            >
              <Phone className="mr-2 h-4 w-4" />
              Contact Manager
            </Button>
          }
        />

        <MiniStatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={DollarSign}
          gradient="linear-gradient(135deg, #10B981, #059669)"
        />

        {/* Online Payment Section */}
        <Card>
          <CardHeader>
            <CardTitle>Make a Payment</CardTitle>
            <CardDescription>
              Pay online securely via Razorpay (UPI, Cards, Net Banking)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center gap-2">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No active projects found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="project-select">Select Project</Label>
                    <Select
                      value={selectedProjectId}
                      onValueChange={setSelectedProjectId}
                    >
                      <SelectTrigger id="project-select">
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.client?.lead?.name ?? `Project`} (
                            {project.status.replace(/_/g, " ")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Amount (INR)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Enter amount"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                </div>

                {selectedProjectId && wallet && (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Project Value</p>
                        <p className="font-semibold">
                          {formatCurrency(wallet.total_agreed_value)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Paid</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(wallet.total_received)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Spent</p>
                        <p className="font-semibold text-orange-600">
                          {formatCurrency(wallet.total_spent)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Balance</p>
                        <p className="font-semibold">
                          {formatCurrency(wallet.current_balance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProjectId && isValidAmount ? (
                  <RazorpayButton
                    projectId={selectedProjectId}
                    amount={parsedAmount}
                    projectName={projectName}
                    clientName={user?.full_name ?? ""}
                    clientEmail={user?.email ?? ""}
                    clientPhone={(user as unknown as { phone?: string })?.phone ?? ""}
                    description={`Payment for ${projectName}`}
                    onSuccess={handlePaymentSuccess}
                  />
                ) : (
                  <Button disabled>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {!selectedProjectId
                      ? "Select a project to pay"
                      : "Enter a valid amount"}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Milestones</CardTitle>
            <CardDescription>
              Standard payment schedule for your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                {
                  milestone: "Advance Payment",
                  percent: "20%",
                  description: "Due at project confirmation",
                },
                {
                  milestone: "Before Carpentry",
                  percent: "30%",
                  description: "Due before woodwork begins",
                },
                {
                  milestone: "Before Finishing",
                  percent: "40%",
                  description: "Due before painting and finishing",
                },
                {
                  milestone: "On Handover",
                  percent: "10%",
                  description: "Due at final handover and inspection",
                },
              ].map((m) => (
                <div
                  key={m.milestone}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.milestone}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.description}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{m.percent}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              For bank transfer payments, please contact your project manager
              who will provide the details.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>All your project payments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : payments.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center gap-2">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No payments recorded yet
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">
                          {format(
                            new Date(payment.created_at),
                            "MMM d, yyyy"
                          )}
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "CLEARED"
                                ? "success"
                                : payment.status === "PENDING"
                                  ? "warning"
                                  : "destructive"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  )
}

"use client"

import { useQuery } from "@tanstack/react-query"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreditCard, DollarSign, Loader2, Phone } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/utils"
import { PageHeader, MiniStatCard } from "@/components/layout/page-header"

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

export default function ClientPaymentsPage() {
  const { toast } = useToast()

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["client-payments"],
    queryFn: async () => {
      const response = await api.get("/finance/transactions")
      return response.data.items ?? response.data
    },
  })

  const payments = transactions.filter(
    (t) => t.category === "INFLOW" && t.source === "CLIENT"
  )
  const totalPaid = payments
    .filter((p) => p.status === "CLEARED")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

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
                { milestone: "Advance Payment", percent: "20%", description: "Due at project confirmation" },
                { milestone: "Before Carpentry", percent: "30%", description: "Due before woodwork begins" },
                { milestone: "Before Finishing", percent: "40%", description: "Due before painting and finishing" },
                { milestone: "On Handover", percent: "10%", description: "Due at final handover and inspection" },
              ].map((m) => (
                <div
                  key={m.milestone}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{m.milestone}</p>
                    <p className="text-xs text-muted-foreground">{m.description}</p>
                  </div>
                  <span className="text-sm font-semibold">{m.percent}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              To arrange a payment, please contact your project manager who will provide bank transfer details or a payment link.
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
                <p className="text-muted-foreground">No payments recorded yet</p>
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
                          {format(new Date(payment.created_at), "MMM d, yyyy")}
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

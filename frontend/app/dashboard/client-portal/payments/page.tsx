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
import { CreditCard, DollarSign, Loader2 } from "lucide-react"
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
              onClick={() => {
                toast({
                  title: "Payment gateway",
                  description:
                    "Online payment integration is not yet available. Please contact your project manager.",
                })
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Make Payment
            </Button>
          }
        />

        <MiniStatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={DollarSign}
          gradient="linear-gradient(135deg, #10B981, #059669)"
        />

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

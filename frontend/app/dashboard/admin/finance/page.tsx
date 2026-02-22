"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Badge } from "@/components/ui/badge"
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
import { DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

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

export default function FinancePage() {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["finance-transactions"],
    queryFn: async () => {
      const response = await api.get("/finance/transactions")
      return response.data.items ?? response.data
    },
  })

  const inflows = transactions.filter((t) => t.category === "INFLOW")
  const outflows = transactions.filter((t) => t.category === "OUTFLOW")
  const totalIn = inflows.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)
  const totalOut = outflows.reduce((sum, t) => sum + Number(t.amount ?? 0), 0)

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER"]}>
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <DollarSign className="h-6 w-6" />
            Finance
          </h2>
          <p className="text-muted-foreground">
            Track payments, expenses, and project financial health
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIn)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOut)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalIn - totalOut)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>All financial transactions across projects</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center gap-2">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground">No transactions recorded yet</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 20).map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <Badge
                            variant={txn.category === "INFLOW" ? "success" : "destructive"}
                          >
                            {txn.category}
                          </Badge>
                        </TableCell>
                        <TableCell>{txn.source}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {txn.description}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(txn.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{txn.status}</Badge>
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

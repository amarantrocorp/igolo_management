"use client"

import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DollarSign, TrendingUp, TrendingDown, Loader2, Wallet } from "lucide-react"
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
        <PageHeader
          icon={Wallet}
          title="Finance"
          subtitle="Track payments, expenses, and project financial health"
          gradient="linear-gradient(135deg, #CBB282, #A8956E)"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <MiniStatCard
            title="Total Inflow"
            value={formatCurrency(totalIn)}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #10B981, #059669)"
          />
          <MiniStatCard
            title="Total Outflow"
            value={formatCurrency(totalOut)}
            icon={TrendingDown}
            gradient="linear-gradient(135deg, #F43F5E, #E11D48)"
          />
          <MiniStatCard
            title="Net Balance"
            value={formatCurrency(totalIn - totalOut)}
            icon={DollarSign}
            gradient="linear-gradient(135deg, #CBB282, #A8956E)"
          />
        </div>

        <div className="animate-fade-in-up delay-3 rounded-2xl border border-border/40 bg-card">
          <div className="flex items-center justify-between border-b border-border/40 p-5">
            <div>
              <h3 className="font-semibold">Recent Transactions</h3>
              <p className="text-xs text-muted-foreground">All financial transactions across projects</p>
            </div>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                  <DollarSign className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No transactions recorded yet</p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  )
}

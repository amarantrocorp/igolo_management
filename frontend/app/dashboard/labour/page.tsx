"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import RoleGuard from "@/components/auth/role-guard"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  HardHat,
  Plus,
  ClipboardCheck,
  Search,
  Phone,
  UserPlus,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

// ── Types ──

type TradeType =
  | "Carpenter"
  | "Electrician"
  | "Painter"
  | "Plumber"
  | "Polisher"
  | "Glass Worker"
  | "Stone Worker"
  | "Helper"

type WorkerStatus = "Assigned" | "Available"

interface Worker {
  id: string
  name: string
  trade: TradeType
  phone: string
  dailyRate: number
  status: WorkerStatus
  assignedProject: string | null
}

interface AttendanceEntry {
  id: string
  worker: string
  date: string
  hours: number
  cost: number
  notes: string
  status: "Pending" | "Approved"
}

const TRADE_TYPES: TradeType[] = [
  "Carpenter",
  "Electrician",
  "Painter",
  "Plumber",
  "Polisher",
  "Glass Worker",
  "Stone Worker",
  "Helper",
]

// Map API specialization to trade type
function mapSpecToTrade(spec: string): TradeType {
  const map: Record<string, TradeType> = {
    CIVIL: "Helper",
    CARPENTRY: "Carpenter",
    PAINTING: "Painter",
    ELECTRICAL: "Electrician",
  }
  return map[spec] || "Helper"
}

// Flatten teams -> workers from API response
function flattenTeamsToWorkers(teams: any[]): Worker[] {
  const workers: Worker[] = []
  for (const team of teams) {
    if (team.workers && team.workers.length > 0) {
      for (const w of team.workers) {
        workers.push({
          id: w.id,
          name: w.name,
          trade: mapSpecToTrade(team.specialization),
          phone: team.contact_number || "—",
          dailyRate: Number(w.daily_rate) || Number(team.default_daily_rate) || 0,
          status: "Available",
          assignedProject: null,
        })
      }
    } else {
      // Team with no individual workers listed — show the team leader
      workers.push({
        id: team.id,
        name: team.leader_name || team.name,
        trade: mapSpecToTrade(team.specialization),
        phone: team.contact_number || "—",
        dailyRate: Number(team.default_daily_rate) || 0,
        status: "Available",
        assignedProject: null,
      })
    }
  }
  return workers
}

// ── Helpers ──

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-purple-500",
    "bg-rose-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ── Component ──

export default function LabourManagementPage() {
  const [tradeFilter, setTradeFilter] = useState<string>("all")
  const [projectFilter, setProjectFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("directory")
  const [workers, setWorkers] = useState<Worker[]>([])
  const [showAttendanceForm, setShowAttendanceForm] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceEntry[]>([])

  // Fetch labor teams from API and flatten to workers
  const { data: apiTeams = [] } = useQuery<any[]>({
    queryKey: ["labor-teams"],
    queryFn: async () => {
      const res = await api.get("/labor/teams")
      return res.data.items ?? res.data ?? []
    },
  })

  // Fetch projects for assignment dropdown
  const { data: apiProjects = [] } = useQuery<any[]>({
    queryKey: ["projects-list"],
    queryFn: async () => {
      try {
        const res = await api.get("/projects")
        return res.data.items ?? res.data ?? []
      } catch {
        return []
      }
    },
  })

  const projectNames = apiProjects.map((p: any) => p.site_address || p.client?.user?.full_name || `Project ${p.id?.slice(0, 8)}`)

  // Sync API teams into local state
  useEffect(() => {
    if (apiTeams.length > 0) {
      setWorkers(flattenTeamsToWorkers(apiTeams))
    }
  }, [apiTeams])

  // Attendance form state
  const [attWorker, setAttWorker] = useState("")
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0])
  const [attHours, setAttHours] = useState("")
  const [attNotes, setAttNotes] = useState("")

  // Add Labour form state
  const [newName, setNewName] = useState("")
  const [newTrade, setNewTrade] = useState<TradeType>("Carpenter")
  const [newPhone, setNewPhone] = useState("")
  const [newRate, setNewRate] = useState("")

  const filteredWorkers = workers.filter((w) => {
    if (tradeFilter !== "all" && w.trade !== tradeFilter) return false
    if (projectFilter !== "all" && w.assignedProject !== projectFilter) return false
    if (search && !w.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "MANAGER", "SUPERVISOR"]}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          icon={HardHat}
          title="Labour Management"
          subtitle="Manage workforce allocation, attendance, and costs"
          gradient="linear-gradient(135deg, #f59e0b, #d97706)"
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => { setShowAttendanceForm(!showAttendanceForm); setShowAddForm(false) }}>
                <ClipboardCheck className="h-4 w-4" />
                Mark Attendance
              </Button>
              <Button className="gap-2" onClick={() => { setShowAddForm(!showAddForm); setShowAttendanceForm(false) }}>
                <Plus className="h-4 w-4" />
                Add Labour
              </Button>
            </div>
          }
        />

        {/* Attendance Form */}
        {showAttendanceForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Mark Attendance</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAttendanceForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Worker</Label>
                <Select value={attWorker} onValueChange={setAttWorker}>
                  <SelectTrigger><SelectValue placeholder="Select worker" /></SelectTrigger>
                  <SelectContent>
                    {workers.map((w) => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Hours Worked</Label>
                <Input type="number" placeholder="8" min="0.5" max="24" step="0.5" value={attHours} onChange={(e) => setAttHours(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input placeholder="Work description" value={attNotes} onChange={(e) => setAttNotes(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => {
              if (!attWorker) { toast({ title: "Missing fields", description: "Please select a worker." }); return }
              if (!attHours) { toast({ title: "Missing fields", description: "Please enter hours worked." }); return }
              const hours = parseFloat(attHours)
              if (hours < 0.5 || hours > 24) { toast({ title: "Invalid", description: "Hours must be between 0.5 and 24" }); return }
              const worker = workers.find((w) => w.name === attWorker)
              const cost = worker ? Math.round((worker.dailyRate / 8) * hours) : 0
              setAttendanceLogs([{ id: `att-${Date.now()}`, worker: attWorker, date: attDate, hours, cost, notes: attNotes, status: "Pending" }, ...attendanceLogs])
              toast({ title: "Attendance marked", description: `${attWorker} - ${hours}h on ${attDate}` })
              setAttWorker(""); setAttHours(""); setAttNotes("")
            }}>Submit Attendance</Button>
          </div>
        )}

        {/* Add Labour Form */}
        {showAddForm && (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Add New Worker</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Trade</Label>
                <Select value={newTrade} onValueChange={(v) => setNewTrade(v as TradeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRADE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+91 XXXXX XXXXX" inputMode="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9+\s-]/g, ""))} />
              </div>
              <div className="space-y-2">
                <Label>Daily Rate</Label>
                <Input type="number" placeholder="1200" min="1" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => {
              if (!newName || !newPhone || !newRate) { toast({ title: "Missing fields", description: "Please fill in all worker details." }); return }
              if (!/^[a-zA-Z\s]+$/.test(newName.trim())) { toast({ title: "Invalid", description: "Name must contain only letters and spaces" }); return }
              if (Number(newRate) <= 0) { toast({ title: "Invalid", description: "Daily rate must be greater than 0" }); return }
              const newWorker: Worker = { id: String(Date.now()), name: newName, trade: newTrade, phone: newPhone, dailyRate: Number(newRate), status: "Available", assignedProject: null }
              setWorkers([...workers, newWorker])
              toast({ title: "Worker added", description: `${newName} (${newTrade}) added to directory` })
              setNewName(""); setNewPhone(""); setNewRate("")
            }}>Save Worker</Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="directory">Labour Directory</TabsTrigger>
            <TabsTrigger value="attendance">Attendance &amp; Cost</TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search workers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={tradeFilter} onValueChange={setTradeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TRADE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projectNames.map((p: string) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Worker Name</TableHead>
                    <TableHead>Trade / Type</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead className="text-right">Daily Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Project</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(worker.name)}`}
                          >
                            {getInitials(worker.name)}
                          </div>
                          <span className="font-medium">{worker.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{worker.trade}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          {worker.phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {"\u20B9"}{worker.dailyRate.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={worker.status === "Assigned" ? "default" : "success"}
                          className={
                            worker.status === "Assigned"
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-100"
                              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          }
                        >
                          {worker.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {worker.assignedProject ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={worker.status === "Available" ? "default" : "outline"}
                          className="gap-1.5"
                          onClick={() => {
                            const firstProject = projectNames[0] || "Project"
                            setWorkers(workers.map((w) =>
                              w.id === worker.id
                                ? {
                                    ...w,
                                    status: w.status === "Available" ? "Assigned" : "Available",
                                    assignedProject: w.status === "Available" ? firstProject : null,
                                  }
                                : w
                            ))
                            toast({
                              title: worker.status === "Available" ? "Worker assigned to project" : "Worker unassigned",
                              description: worker.status === "Available"
                                ? `${worker.name} assigned to ${firstProject}`
                                : `${worker.name} is now available`,
                            })
                          }}
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          {worker.status === "Available" ? "Assign" : "Unassign"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredWorkers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        {workers.length === 0 ? "No workers found. Add your first worker." : "No workers found matching the selected filters."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <div className="rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Worker</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceLogs.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="font-medium">{entry.worker}</TableCell>
                      <TableCell className="text-right">{entry.hours}h</TableCell>
                      <TableCell className="text-right font-medium">{"\u20B9"}{entry.cost.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-muted-foreground">{entry.notes || "\u2014"}</TableCell>
                      <TableCell>
                        <Badge className={entry.status === "Approved" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {attendanceLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No attendance records yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

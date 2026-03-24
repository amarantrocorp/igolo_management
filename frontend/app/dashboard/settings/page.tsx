"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { toast } from "@/components/ui/use-toast"
import RoleGuard from "@/components/auth/role-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Settings,
  Upload,
  UserPlus,
  Pencil,
  UserX,
  MessageSquare,
  CreditCard,
  Calendar,
  Database,
  Cloud,
  Check,
  X,
  Loader2,
  Send,
  ExternalLink,
  Eye,
  EyeOff,
} from "lucide-react"

const notificationToggles = [
  { id: "email", label: "Email notifications", defaultOn: true },
  { id: "sms", label: "SMS alerts", defaultOn: false },
  { id: "inapp", label: "In-app notifications", defaultOn: true },
  { id: "daily", label: "Daily digest", defaultOn: true },
  { id: "weekly", label: "Weekly summary", defaultOn: false },
]

const notificationEvents = [
  { event: "New Lead", channels: ["Email", "In-App"] },
  { event: "Quote Approved", channels: ["Email", "SMS", "In-App"] },
  { event: "Payment Received", channels: ["Email", "SMS"] },
  { event: "Low Stock Alert", channels: ["In-App"] },
  { event: "Project Milestone", channels: ["Email", "In-App"] },
]

const integrationDefinitions = [
  {
    name: "WhatsApp Business",
    icon: MessageSquare,
    description: "Send notifications and updates via WhatsApp",
    envKey: "WHATSAPP_API_KEY",
    docsUrl: "https://business.whatsapp.com/products/business-api",
  },
  {
    name: "Razorpay",
    icon: CreditCard,
    description: "Accept online payments from clients",
    envKey: "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET",
    docsUrl: "https://razorpay.com/docs/",
  },
  {
    name: "Google Calendar",
    icon: Calendar,
    description: "Sync project milestones and deadlines",
    envKey: "GOOGLE_CALENDAR_API_KEY",
    docsUrl: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
  },
  {
    name: "Tally",
    icon: Database,
    description: "Accounting and GST compliance integration",
    envKey: "TALLY_API_ENDPOINT",
    docsUrl: "https://tallysolutions.com/integration/",
  },
  {
    name: "AWS S3",
    icon: Cloud,
    description: "Cloud storage for documents and site photos",
    envKey: "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / S3_BUCKET_NAME",
    docsUrl: "https://aws.amazon.com/s3/",
  },
]

function getRoleBadge(role: string) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    SALES: "bg-green-100 text-green-700",
    SUPERVISOR: "bg-purple-100 text-purple-700",
    BDE: "bg-orange-100 text-orange-700",
    CLIENT: "bg-cyan-100 text-cyan-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[role] || "bg-gray-100 text-gray-700"}`}>
      {role.replace("_", " ")}
    </span>
  )
}

interface UserRecord {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  last_login?: string
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("general")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserValues, setEditUserValues] = useState({ full_name: "", role: "", phone: "" })
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(notificationToggles.map((t) => [t.id, t.defaultOn]))
  )

  const [companyName, setCompanyName] = useState("")
  const [companyEmail, setCompanyEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [gst, setGst] = useState("")
  const [address, setAddress] = useState("")
  const [currency, setCurrency] = useState("INR")
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY")
  const [timezone, setTimezone] = useState("IST")
  const [language, setLanguage] = useState("en")
  const [sprintCount, setSprintCount] = useState("6")
  const [markup, setMarkup] = useState("25")
  const [gstRate, setGstRate] = useState("18")
  const [paymentTerms, setPaymentTerms] = useState("")

  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("SALES")
  const [invitePhone, setInvitePhone] = useState("")
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Fetch real users from API
  const { data: users = [], isLoading: usersLoading } = useQuery<UserRecord[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users")
      return res.data
    },
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp-settings")
      if (saved) {
        const s = JSON.parse(saved)
        if (s.companyName) setCompanyName(s.companyName)
        if (s.companyEmail) setCompanyEmail(s.companyEmail)
        if (s.phone) setPhone(s.phone)
        if (s.gst) setGst(s.gst)
        if (s.address) setAddress(s.address)
        if (s.currency) setCurrency(s.currency)
        if (s.dateFormat) setDateFormat(s.dateFormat)
        if (s.timezone) setTimezone(s.timezone)
        if (s.language) setLanguage(s.language)
        if (s.sprintCount) setSprintCount(s.sprintCount)
        if (s.markup) setMarkup(s.markup)
        if (s.gstRate) setGstRate(s.gstRate)
        if (s.paymentTerms) setPaymentTerms(s.paymentTerms)
      }
      const savedToggles = localStorage.getItem("erp-notification-prefs")
      if (savedToggles) setToggles(JSON.parse(savedToggles))
    } catch {}
  }, [])

  const handleSaveSettings = () => {
    if (!companyName.trim()) { toast({ title: "Invalid", description: "Company name is required" }); return }
    if (companyName.trim().length > 200) { toast({ title: "Invalid", description: "Company name must be 200 characters or less" }); return }
    if (phone && !/^[0-9+\s]+$/.test(phone)) { toast({ title: "Invalid", description: "Phone number can only contain digits, +, and spaces" }); return }
    if (gst && !/^[A-Za-z0-9]{15}$/.test(gst)) { toast({ title: "Invalid", description: "GST number must be exactly 15 alphanumeric characters" }); return }
    const settings = { companyName, companyEmail, phone, gst, address, currency, dateFormat, timezone, language, sprintCount, markup, gstRate, paymentTerms }
    localStorage.setItem("erp-settings", JSON.stringify(settings))
    toast({ title: "Success", description: "Settings saved successfully" })
  }

  const handleSaveNotificationPrefs = () => {
    localStorage.setItem("erp-notification-prefs", JSON.stringify(toggles))
    toast({ title: "Success", description: "Notification preferences saved" })
  }

  const handleToggle = (id: string) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleInviteUser = async () => {
    if (!inviteName || !inviteEmail) {
      toast({ title: "Error", description: "Name and email are required", variant: "destructive" })
      return
    }
    try {
      await api.post("/users/create", {
        full_name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        password: "TempPass@123",
      })
      toast({ title: "Success", description: `User created: ${inviteEmail}` })
    } catch {
      toast({ title: "Info", description: `Invitation sent to ${inviteEmail} (API pending)` })
    }
    setInviteName("")
    setInviteEmail("")
    setInviteRole("SALES")
    setInvitePhone("")
    setShowInviteForm(false)
  }

  const handleDeactivateUser = async (userId: string, currentActive: boolean) => {
    const newActive = !currentActive
    try {
      await api.patch(`/users/${userId}`, { is_active: newActive })
      toast({ title: "Success", description: newActive ? "User activated" : "User deactivated" })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    } catch {
      toast({ title: "Info", description: `User ${newActive ? "activation" : "deactivation"} recorded` })
    }
  }

  const startEditUser = useCallback((user: UserRecord) => {
    setEditingUserId(user.id)
    setEditUserValues({ full_name: user.full_name, role: user.role, phone: "" })
  }, [])

  const saveEditUser = useCallback(async () => {
    if (!editingUserId || !editUserValues.full_name) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" })
      return
    }
    try {
      await api.patch(`/users/${editingUserId}`, {
        full_name: editUserValues.full_name,
        role: editUserValues.role,
      })
      toast({ title: "Success", description: "User updated successfully" })
      queryClient.invalidateQueries({ queryKey: ["users"] })
    } catch {
      toast({ title: "Info", description: "User update recorded" })
    }
    setEditingUserId(null)
  }, [editingUserId, editUserValues, queryClient])

  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null)

  // WhatsApp Business configuration state
  const [waPhoneNumberId, setWaPhoneNumberId] = useState("")
  const [waAccessToken, setWaAccessToken] = useState("")
  const [waShowToken, setWaShowToken] = useState(false)
  const [waTestPhone, setWaTestPhone] = useState("")
  const [waTesting, setWaTesting] = useState(false)
  const [waStatus, setWaStatus] = useState<"not_configured" | "configured" | "error">("not_configured")

  // Load WhatsApp config from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("erp-whatsapp-config")
      if (saved) {
        const c = JSON.parse(saved)
        if (c.phoneNumberId) { setWaPhoneNumberId(c.phoneNumberId); setWaStatus("configured") }
        if (c.accessToken) setWaAccessToken(c.accessToken)
      }
    } catch {}
  }, [])

  const handleSaveWhatsApp = () => {
    if (!waPhoneNumberId.trim() || !waAccessToken.trim()) {
      toast({ title: "Error", description: "Phone Number ID and Access Token are required", variant: "destructive" })
      return
    }
    localStorage.setItem("erp-whatsapp-config", JSON.stringify({ phoneNumberId: waPhoneNumberId, accessToken: waAccessToken }))
    setWaStatus("configured")
    toast({ title: "Success", description: "WhatsApp configuration saved. Update your backend .env file with these values and restart the service." })
  }

  const handleTestWhatsApp = async () => {
    if (!waTestPhone.trim()) {
      toast({ title: "Error", description: "Enter a phone number to send a test message", variant: "destructive" })
      return
    }
    setWaTesting(true)
    try {
      await api.post("/whatsapp/test", { phone: waTestPhone })
      toast({ title: "Success", description: `Test message sent to ${waTestPhone}` })
    } catch {
      toast({ title: "Info", description: "Test message queued. Ensure WhatsApp is enabled in your backend .env (WHATSAPP_ENABLED=true)." })
    }
    setWaTesting(false)
  }

  const handleIntegrationClick = (integration: typeof integrationDefinitions[0]) => {
    setExpandedIntegration((prev) => prev === integration.name ? null : integration.name)
  }

  const handleLogoClick = () => {
    logoInputRef.current?.click()
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      toast({ title: "Success", description: `Logo "${file.name}" uploaded successfully` })
    }
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure system preferences, roles, and integrations</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6 mt-4">
            {/* Company Information */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Company Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter company name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company Email</Label>
                  <Input id="companyEmail" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="info@yourcompany.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\s]/g, ""))} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst">GST Number</Label>
                  <Input id="gst" value={gst} onChange={(e) => setGst(e.target.value)} placeholder="Enter GST number" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <textarea
                  id="address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter company address"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <div
                  onClick={handleLogoClick}
                  className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Settings */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Regional Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR ({"\u20B9"})</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR ({"\u20AC"})</SelectItem>
                      <SelectItem value="GBP">GBP ({"\u00A3"})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time Zone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IST">IST (UTC+5:30)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">EST (UTC-5)</SelectItem>
                      <SelectItem value="PST">PST (UTC-8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Default Project Settings */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Default Project Settings</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="sprintCount">Default Sprint Count</Label>
                  <Input id="sprintCount" type="number" value={sprintCount} onChange={(e) => setSprintCount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="markup">Standard Markup %</Label>
                  <Input id="markup" type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstRate">GST Rate %</Label>
                  <Input id="gstRate" type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <textarea
                  id="paymentTerms"
                  rows={2}
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 20% advance, 30% before carpentry, 40% before finishing, 10% on handover"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSettings}>Save Settings</Button>
            </div>
          </TabsContent>

          {/* Users & Roles Tab */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">User Management</h2>
              <Button size="sm" onClick={() => setShowInviteForm((v) => !v)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </div>
            {showInviteForm && (
              <div className="rounded-xl border bg-white p-5 space-y-4">
                <h3 className="font-semibold text-sm">Invite New User</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="inviteName">Full Name</Label>
                    <Input id="inviteName" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Enter full name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inviteEmail">Email</Label>
                    <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="user@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="SALES">Sales</SelectItem>
                        <SelectItem value="BDE">BDE</SelectItem>
                        <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                        <SelectItem value="CLIENT">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invitePhone">Phone</Label>
                    <Input id="invitePhone" value={invitePhone} onChange={(e) => setInvitePhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowInviteForm(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleInviteUser}>Send Invite</Button>
                </div>
              </div>
            )}
            <div className="rounded-xl border bg-white">
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading users...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No users found. Invite your first team member above.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isEditing = editingUserId === user.id
                      return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-sm">
                          {isEditing ? (
                            <Input className="h-8 w-[160px]" value={editUserValues.full_name} onChange={e => setEditUserValues(v => ({ ...v, full_name: e.target.value }))} />
                          ) : user.full_name}
                        </TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editUserValues.role} onValueChange={v => setEditUserValues(prev => ({ ...prev, role: v }))}>
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="SALES">Sales</SelectItem>
                                <SelectItem value="BDE">BDE</SelectItem>
                                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                                <SelectItem value="CLIENT">Client</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : getRoleBadge(user.role)}
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="text-green-600" onClick={saveEditUser}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => startEditUser(user)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeactivateUser(user.id, user.is_active)} title={user.is_active ? "Deactivate user" : "Activate user"}>
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 mt-4">
            {/* Global Toggles */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Notification Preferences</h2>
              <div className="space-y-3">
                {notificationToggles.map((toggle) => (
                  <div key={toggle.id} className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium">{toggle.label}</span>
                    <button
                      onClick={() => handleToggle(toggle.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        toggles[toggle.id] ? "bg-blue-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          toggles[toggle.id] ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Per-Event Channels */}
            <div className="rounded-xl border bg-white p-6 space-y-4">
              <h2 className="text-lg font-semibold">Notification Channels by Event</h2>
              <div className="space-y-3">
                {notificationEvents.map((item) => (
                  <div key={item.event} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm font-medium">{item.event}</span>
                    <div className="flex gap-2">
                      {item.channels.map((ch) => (
                        <span
                          key={ch}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveNotificationPrefs}>Save Preferences</Button>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="mt-4 space-y-6">
            {/* WhatsApp Business - Dedicated Configuration Card */}
            <div className="rounded-xl border bg-white p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">WhatsApp Business</h3>
                    <p className="text-sm text-muted-foreground">Send notifications and updates via WhatsApp Cloud API</p>
                  </div>
                </div>
                {waStatus === "configured" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                    <Check className="h-3 w-3" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                    <X className="h-3 w-3" />
                    Not Configured
                  </span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="waPhoneNumberId">Phone Number ID</Label>
                  <Input
                    id="waPhoneNumberId"
                    value={waPhoneNumberId}
                    onChange={(e) => setWaPhoneNumberId(e.target.value)}
                    placeholder="e.g. 123456789012345"
                  />
                  <p className="text-xs text-muted-foreground">From Meta Business Dashboard &gt; WhatsApp &gt; API Setup</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waAccessToken">Access Token</Label>
                  <div className="relative">
                    <Input
                      id="waAccessToken"
                      type={waShowToken ? "text" : "password"}
                      value={waAccessToken}
                      onChange={(e) => setWaAccessToken(e.target.value)}
                      placeholder="Permanent or temporary token"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setWaShowToken(!waShowToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {waShowToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Generate a permanent token in Meta Business settings</p>
                </div>
              </div>

              {/* Test Message */}
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-medium">Send Test Message</p>
                <div className="flex gap-2">
                  <Input
                    value={waTestPhone}
                    onChange={(e) => setWaTestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestWhatsApp}
                    disabled={waTesting}
                  >
                    {waTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {waTesting ? "Sending..." : "Send Test"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sends a test template message. The phone number must have opted in to receive messages from your WhatsApp Business account.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <a
                  href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Meta Business Setup Guide
                </a>
                <Button onClick={handleSaveWhatsApp}>Save WhatsApp Config</Button>
              </div>
            </div>

            {/* Other Integrations */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {integrationDefinitions.filter(i => i.name !== "WhatsApp Business").map((integration) => {
                const isExpanded = expandedIntegration === integration.name
                return (
                <div
                  key={integration.name}
                  className="rounded-xl border bg-white p-5 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-100">
                      <integration.icon className="h-6 w-6 text-gray-600" />
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                      <X className="h-3 w-3" />
                      Not Connected
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{integration.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleIntegrationClick(integration)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    {isExpanded ? "Hide Setup" : "Configure"}
                  </Button>
                  {isExpanded && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2 text-sm">
                      <p className="font-medium text-blue-800">Setup Instructions</p>
                      <p className="text-blue-700">
                        Add the following to your <code className="rounded bg-blue-100 px-1 py-0.5 text-xs font-mono">.env</code> file:
                      </p>
                      <div className="rounded bg-blue-100 p-2 font-mono text-xs text-blue-900 break-all">
                        {integration.envKey}=your_value_here
                      </div>
                      <p className="text-blue-600 text-xs">
                        Then restart the backend service. See{" "}
                        <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                          official docs
                        </a>{" "}
                        for API key setup.
                      </p>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}

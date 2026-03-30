// ============================================================
// User & Auth
// ============================================================

export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "BDE"
  | "SALES"
  | "SUPERVISOR"
  | "CLIENT"
  | "LABOR_LEAD"

export interface User {
  id: string
  email: string
  full_name: string
  phone?: string
  role?: UserRole
  is_active: boolean
  avatar_url?: string
  is_platform_admin?: boolean
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

// ============================================================
// Multi-Tenancy / Organizations
// ============================================================

export type PlanTier = "FREE" | "STARTER" | "PRO" | "ENTERPRISE"

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "SUSPENDED"

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  address?: string
  gst_number?: string
  is_active: boolean
  plan_tier: PlanTier
  subscription_status?: SubscriptionStatus
  trial_expires_at?: string
  max_users?: number
  max_projects?: number
  created_at: string
}

export interface OrgMembership {
  id: string
  org_id: string
  org_name: string
  org_slug: string
  role: UserRole
  is_default: boolean
}

export interface OrgOption {
  id: string
  name: string
  slug: string
  role: UserRole
}

export interface LoginResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  requires_org_selection: boolean
  organizations?: OrgOption[]
}

export interface UserWithOrg extends User {
  active_org_id: string
  role_in_org: UserRole
  organizations: OrgMembership[]
}

// ============================================================
// CRM - Leads & Clients
// ============================================================

export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "QUOTATION_SENT"
  | "NEGOTIATION"
  | "CONVERTED"
  | "LOST"

export type PropertyType =
  | "APARTMENT"
  | "VILLA"
  | "INDEPENDENT_HOUSE"
  | "PENTHOUSE"
  | "STUDIO"
  | "OFFICE"
  | "RETAIL"
  | "OTHER"

export type PropertyStatus =
  | "UNDER_CONSTRUCTION"
  | "READY_TO_MOVE"
  | "OCCUPIED"
  | "RENOVATION"

export type SiteVisitAvailability =
  | "WEEKDAYS"
  | "WEEKENDS"
  | "ANYTIME"
  | "NOT_AVAILABLE"

export interface Lead {
  id: string
  name: string
  contact_number: string
  email?: string
  source: string
  status: LeadStatus
  location?: string
  notes?: string
  assigned_to_id: string
  assigned_to?: User
  quotations?: Quotation[]

  // Project Details
  property_type?: PropertyType
  property_status?: PropertyStatus
  carpet_area?: number
  scope_of_work?: string[]
  floor_plan_url?: string

  // Preferences
  budget_range?: string
  design_style?: string
  possession_date?: string
  site_visit_availability?: SiteVisitAvailability

  created_at: string
  updated_at: string
}

export type ActivityType = "CALL" | "EMAIL" | "MEETING" | "NOTE" | "SITE_VISIT"

export interface LeadActivity {
  id: string
  lead_id: string
  type: ActivityType
  description: string
  date: string
  created_by_id: string
  created_at: string
}

export interface Client {
  id: string
  user_id: string
  user?: User
  lead_id: string
  lead?: Lead
  address: string
  gst_number?: string
  wallet_balance: number
  created_at: string
  updated_at: string
}

// ============================================================
// Quotation Engine
// ============================================================

export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"

export interface Quotation {
  id: string
  lead_id: string
  lead?: Lead
  version: number
  total_amount: number
  status: QuoteStatus
  valid_until: string
  cover_image_url?: string
  project_id?: string
  rooms: QuoteRoom[]
  created_at: string
  updated_at: string
}

export interface QuoteRoom {
  id: string
  quotation_id: string
  name: string
  area_sqft: number
  items: QuoteItem[]
}

export interface QuoteItem {
  id: string
  room_id: string
  inventory_item_id: string
  inventory_item?: Item
  description: string
  quantity: number
  unit_price: number
  markup_percentage: number
  final_price: number
}

export interface QuoteFormValues {
  client_id: string
  rooms: {
    name: string
    items: {
      item_id: string
      quantity: number
      markup: number
    }[]
  }[]
}

// ============================================================
// Inventory & Procurement
// ============================================================

export interface Item {
  id: string
  name: string
  sku?: string
  category: string
  unit: string
  base_price: number
  selling_price: number
  current_stock: number
  reorder_level: number
  image_url?: string
  is_low_stock?: boolean
  supplier_count?: number
  suppliers?: VendorItem[]
  created_at: string
  updated_at?: string
}

export interface Vendor {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  gst_number?: string
  created_at: string
  updated_at?: string
}

export interface VendorItem {
  id: string
  vendor_id: string
  vendor_name?: string
  item_id: string
  vendor_price: number
  lead_time_days?: number
  created_at: string
}

export type POStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED"

export interface PurchaseOrder {
  id: string
  vendor_id: string
  vendor_name?: string
  status: POStatus
  is_project_specific: boolean
  project_id?: string
  project?: Project
  items: POItem[]
  total_amount: number
  notes?: string
  bill_document_url?: string
  created_at: string
  updated_at?: string
}

export interface POItem {
  id: string
  purchase_order_id?: string
  item_id: string
  item_name?: string
  quantity: number
  unit_price: number
  total_price: number
}

export type StockTransactionType =
  | "PURCHASE_IN"
  | "PROJECT_ISSUE"
  | "DAMAGED"
  | "RETURNED"

export interface StockTransaction {
  id: string
  item_id: string
  quantity: number
  transaction_type: StockTransactionType
  reference_id?: string
  performed_by: string
  unit_cost_at_time: number
  notes?: string
  created_at: string
}

// ============================================================
// Project Materials (aggregated view)
// ============================================================

export interface StockIssueDetail {
  id: string
  item_id: string
  item_name: string
  item_category: string
  item_unit: string
  quantity: number
  unit_cost_at_time: number
  total_cost: number
  performed_by: string
  notes?: string
  created_at: string
}

export interface MaterialsSummary {
  total_po_cost: number
  total_stock_issued_cost: number
  total_materials_cost: number
}

export interface ProjectMaterials {
  purchase_orders: PurchaseOrder[]
  stock_issues: StockIssueDetail[]
  summary: MaterialsSummary
}

// ============================================================
// Project Execution
// ============================================================

export type ProjectStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"

export interface Project {
  id: string
  client_id: string
  client?: Client
  accepted_quotation_id: string
  accepted_quotation?: Quotation
  status: ProjectStatus
  start_date: string
  expected_end_date: string
  total_project_value: number
  cover_image_url?: string
  site_latitude?: number | null
  site_longitude?: number | null
  site_address?: string | null
  geofence_radius_meters?: number
  wallet?: {
    total_agreed_value: number
    total_received: number
    total_spent: number
    current_balance: number
    pending_approvals: number
  }
  sprints: Sprint[]
  variation_orders: VariationOrder[]
  created_at: string
  updated_at: string
}

export type SprintStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "DELAYED"

export interface Sprint {
  id: string
  project_id: string
  sequence_order: number
  name: string
  status: SprintStatus
  start_date: string
  end_date: string
  dependency_sprint_id?: string
  planned_quantity?: number
  executed_quantity?: number
  quantity_unit?: string
  completion_percentage: number
  created_at: string
  updated_at: string
}

export type VOStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PAID"

export interface VariationOrder {
  id: string
  project_id: string
  description: string
  additional_cost: number
  status: VOStatus
  linked_sprint_id?: string
  requested_by_id?: string
  supporting_doc_url?: string
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  project_id: string
  sprint_id: string
  logged_by_id: string
  date: string
  notes: string
  images?: string[]
  image_urls?: string[]
  blockers?: string
  visible_to_client: boolean
  created_by?: string
  created_at: string
}

// ============================================================
// Financials
// ============================================================

export type TransactionCategory = "INFLOW" | "OUTFLOW"

export type TransactionSource =
  | "CLIENT"
  | "VENDOR"
  | "LABOR"
  | "PETTY_CASH"

export type TransactionStatus = "PENDING" | "CLEARED" | "REJECTED"

export interface Transaction {
  id: string
  project_id: string
  category: TransactionCategory
  source: TransactionSource
  amount: number
  description: string
  related_po_id?: string
  related_labor_log_id?: string
  related_vo_id?: string
  recorded_by: string
  proof_doc_url?: string
  status: TransactionStatus
  created_at: string
  updated_at: string
}

export interface ProjectWallet {
  project_id: string
  total_agreed_value: number
  total_received: number
  total_spent: number
  current_balance: number
  pending_approvals: number
  last_updated: string
}

export interface FinancialHealth {
  total_received: number
  total_spent: number
  balance: number
  can_spend_more: boolean
  pending_approvals: number
  burn_rate: number
  estimated_margin: number
}

// ── Finance Analytics ──

export interface TransactionSummary {
  total_inflow: number
  total_outflow: number
  net_balance: number
  pending_inflow: number
  pending_outflow: number
  pending_count: number
  total_count: number
}

export interface AggregationBucket {
  period: string
  inflow: number
  outflow: number
  net: number
}

export interface TransactionAggregation {
  group_by: "day" | "week" | "month"
  buckets: AggregationBucket[]
}

export interface SourceBreakdownItem {
  source: string
  total_inflow: number
  total_outflow: number
}

export interface ProjectBreakdownItem {
  project_id: string
  project_name: string
  total_inflow: number
  total_outflow: number
  net: number
}

// ============================================================
// Labor Management
// ============================================================

export type LaborSpecialization =
  | "CIVIL"
  | "CARPENTRY"
  | "PAINTING"
  | "ELECTRICAL"
  | "PLUMBING"
  | "GENERAL"

export type PaymentModel = "DAILY_WAGE" | "CONTRACT_FIXED"

export type SkillLevel = "HELPER" | "SKILLED" | "FOREMAN"

export type AttendanceStatus =
  | "PENDING"
  | "APPROVED_BY_MANAGER"
  | "PAID"

export interface LaborTeam {
  id: string
  name: string
  leader_name: string
  contact_number: string
  specialization: LaborSpecialization
  payment_model: PaymentModel
  default_daily_rate: number
  supervisor_id?: string
  workers?: Worker[]
  created_at: string
  updated_at: string
}

export interface Worker {
  id: string
  team_id: string
  team?: LaborTeam
  name: string
  skill_level: SkillLevel
  daily_rate: number
  phone?: string
  created_at: string
  updated_at: string
}

export interface AttendanceLog {
  id: string
  project_id: string
  sprint_id: string
  team_id: string
  team?: LaborTeam
  date: string
  workers_present: number
  total_hours: number
  calculated_cost: number
  status: AttendanceStatus
  site_photo_url?: string
  notes?: string
  logged_by_id?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Notifications
// ============================================================

export type NotificationType =
  | "ALERT"
  | "APPROVAL_REQ"
  | "INFO"
  | "PAYMENT_RECEIVED"

export interface Notification {
  id: string
  recipient_id: string
  type: NotificationType
  title: string
  body: string
  action_url?: string
  is_read: boolean
  created_at: string
}

// ============================================================
// Material Requests (Indent)
// ============================================================

export type MaterialRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "FULFILLED"

export interface MaterialRequestItem {
  id: string
  material_request_id: string
  item_id: string
  item_name: string
  item_unit: string
  current_stock: number
  quantity_requested: number
  quantity_approved?: number
  notes?: string
  created_at: string
}

export interface MaterialRequest {
  id: string
  project_id: string
  project_name: string
  sprint_id?: string
  requested_by_id: string
  requested_by_name: string
  status: MaterialRequestStatus
  urgency: string
  notes?: string
  approved_by_id?: string
  approved_at?: string
  items: MaterialRequestItem[]
  items_count: number
  created_at: string
  updated_at: string
}

// ============================================================
// Quality Management
// ============================================================

export type InspectionStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETED"

export type ChecklistItemStatus = "PASS" | "FAIL" | "NA" | "PENDING"

export type SnagSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export type SnagStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "VERIFIED"

export interface InspectionItem {
  id: string
  inspection_id: string
  description: string
  status: ChecklistItemStatus
  photo_url?: string
  notes?: string
  created_at: string
}

export interface Inspection {
  id: string
  project_id: string
  sprint_id: string
  inspector_id: string
  inspector_name: string
  title: string
  status: InspectionStatus
  inspection_date: string
  notes?: string
  overall_score?: number
  checklist_items: InspectionItem[]
  total_items: number
  pass_count: number
  fail_count: number
  created_at: string
}

export interface SnagItem {
  id: string
  project_id: string
  sprint_id?: string
  inspection_id?: string
  description: string
  severity: SnagSeverity
  status: SnagStatus
  photo_url?: string
  assigned_to_id?: string
  assigned_to_name: string
  due_date?: string
  resolution_notes?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface QualitySummary {
  total_inspections: number
  completed_inspections: number
  avg_score?: number
  total_snags: number
  open_snags: number
  critical_snags: number
  resolved_snags: number
}

// ============================================================
// Budget Management
// ============================================================

export type BudgetCategory =
  | "MATERIAL"
  | "LABOR"
  | "SUBCONTRACTOR"
  | "OVERHEAD"
  | "CONTINGENCY"

export interface BudgetLineItem {
  id: string
  project_id: string
  category: BudgetCategory
  description?: string
  budgeted_amount: number
  created_at: string
}

export interface BudgetVsActualItem {
  category: string
  budgeted: number
  actual: number
  variance: number
  variance_pct: number
  alert: boolean
}

export interface BudgetVsActual {
  project_id: string
  line_items: BudgetVsActualItem[]
  total_budgeted: number
  total_actual: number
  total_variance: number
}

// ============================================================
// Invoicing
// ============================================================

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  rate: number
  amount: number
  linked_sprint_id?: string
  hsn_code?: string
  created_at: string
}

export interface Invoice {
  id: string
  project_id: string
  invoice_number: string
  status: InvoiceStatus
  issue_date: string
  due_date: string
  subtotal: number
  tax_percent: number
  tax_amount: number
  total_amount: number
  notes?: string
  items: InvoiceItem[]
  created_at: string
  updated_at: string
}

// ============================================================
// Multi-Level Approvals
// ============================================================

export type ApprovalEntityType =
  | "PO"
  | "VO"
  | "EXPENSE"
  | "MATERIAL_REQUEST"
  | "INVOICE"

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface ApprovalRule {
  id: string
  entity_type: ApprovalEntityType
  min_amount: number
  max_amount?: number
  required_roles: string[]
  created_at: string
}

export interface ApprovalLog {
  id: string
  entity_type: ApprovalEntityType
  entity_id: string
  level: number
  required_role: string
  approver_id?: string
  approver_name?: string
  status: ApprovalStatus
  comments?: string
  created_at: string
  updated_at: string
}

// ============================================================
// P&L
// ============================================================

export interface ProjectPnL {
  project_id: string
  revenue: number
  approved_vo_total: number
  cost_breakdown: {
    materials: number
    labor: number
    overhead: number
    other: number
  }
  total_cost: number
  gross_profit: number
  margin_percent: number
  status: "PROFITABLE" | "BREAK_EVEN" | "LOSS_MAKING"
  monthly_burn_rate: number
  total_received: number
  total_spent: number
  pending_approvals: number
}

// ============================================================
// Work Orders & RA Billing
// ============================================================

export type WorkOrderStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED"

export type RABillStatus = "SUBMITTED" | "VERIFIED" | "APPROVED" | "PAID"

export interface RABill {
  id: string
  work_order_id: string
  bill_number: number
  period_from: string
  period_to: string
  quantity_executed: number
  amount: number
  cumulative_quantity: number
  cumulative_amount: number
  status: RABillStatus
  created_at: string
}

export interface WorkOrder {
  id: string
  project_id: string
  vendor_id?: string
  team_id?: string
  wo_number: string
  description: string
  scope_of_work?: string
  contract_amount: number
  unit_rate?: number
  estimated_quantity?: number
  unit?: string
  status: WorkOrderStatus
  linked_sprint_id?: string
  ra_bills: RABill[]
  created_at: string
  updated_at: string
}

// ============================================================
// Asset/Equipment Management
// ============================================================

export type AssetCondition = "EXCELLENT" | "GOOD" | "FAIR" | "POOR"

export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED"

export interface AssetUsageLog {
  id: string
  asset_id: string
  project_id: string
  assigned_date: string
  returned_date?: string
  condition_on_return?: AssetCondition
  created_at: string
}

export interface Asset {
  id: string
  name: string
  category: string
  serial_number?: string
  purchase_date?: string
  purchase_cost?: number
  condition: AssetCondition
  status: AssetStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Project Documents
// ============================================================

export type DocumentCategory =
  | "DRAWING"
  | "BOQ"
  | "CONTRACT"
  | "PHOTO"
  | "REPORT"
  | "INVOICE"
  | "OTHER"

export interface ProjectDocument {
  id: string
  project_id: string
  name: string
  category: DocumentCategory
  file_url: string
  uploaded_by_id: string
  version: number
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Vendor Bills
// ============================================================

export type VendorBillStatus =
  | "RECEIVED"
  | "VERIFIED"
  | "APPROVED"
  | "PAID"
  | "DISPUTED"

export interface VendorBill {
  id: string
  vendor_id: string
  po_id?: string
  bill_number: string
  bill_date: string
  amount: number
  tax_amount: number
  total_amount: number
  status: VendorBillStatus
  notes?: string
  created_at: string
  updated_at: string
}

// ============================================================
// Project Assignments
// ============================================================

export interface ProjectAssignment {
  id: string
  project_id: string
  user_id: string
  user_name: string
  user_email: string
  role: string
  is_active: boolean
  created_at: string
}

// ============================================================
// API Responses
// ============================================================

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiError {
  detail: string
  status_code: number
}

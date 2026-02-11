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
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
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

export interface Lead {
  id: string
  name: string
  contact_number: string
  email?: string
  source: string
  status: LeadStatus
  location?: string
  budget_range?: string
  assigned_to_id: string
  assigned_to?: User
  notes: string
  quotations?: Quotation[]
  created_at: string
  updated_at: string
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
  category: string
  unit: string
  base_price: number
  selling_price: number
  current_stock: number
  reorder_level: number
  suppliers?: VendorItem[]
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  name: string
  contact_info: string
  created_at: string
  updated_at: string
}

export interface VendorItem {
  id: string
  vendor_id: string
  vendor?: Vendor
  item_id: string
  item?: Item
  unit_price: number
}

export type POStatus = "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED"

export interface PurchaseOrder {
  id: string
  vendor_id: string
  vendor?: Vendor
  status: POStatus
  is_project_specific: boolean
  project_id?: string
  project?: Project
  items: POItem[]
  total_amount: number
  created_at: string
  updated_at: string
}

export interface POItem {
  id: string
  purchase_order_id: string
  item_id: string
  item?: Item
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
  item?: Item
  quantity: number
  transaction_type: StockTransactionType
  reference_id: string
  performed_by: string
  timestamp: string
  unit_cost_at_time: number
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
  created_at: string
  updated_at: string
}

export interface DailyLog {
  id: string
  project_id: string
  sprint_id: string
  notes: string
  images: string[]
  blockers: string
  visible_to_client: boolean
  created_by: string
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

// ============================================================
// Labor Management
// ============================================================

export type LaborSpecialization =
  | "CIVIL"
  | "CARPENTRY"
  | "PAINTING"
  | "ELECTRICAL"

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

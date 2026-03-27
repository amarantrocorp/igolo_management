export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const COLORS = {
  primary: "#0B1120",
  primaryForeground: "#F8FAFC",
  gold: "#CBB282",
  success: "#22C55E",
  warning: "#F59E0B",
  destructive: "#EF4444",
  background: "#FFFFFF",
  muted: "#F1F5F9",
  mutedForeground: "#64748B",
  text: "#0F172A",
  border: "#E2E8F0",
} as const;

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MANAGER: "MANAGER",
  BDE: "BDE",
  SALES: "SALES",
  SUPERVISOR: "SUPERVISOR",
  CLIENT: "CLIENT",
  LABOR_LEAD: "LABOR_LEAD",
} as const;

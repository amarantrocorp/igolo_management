import api from "../../lib/api";
import type { LoginResponse, UserWithOrg } from "../../types";

/**
 * Login with email and password.
 * Backend expects application/x-www-form-urlencoded for OAuth2 password flow.
 */
export async function loginApi(
  email: string,
  password: string,
  tenantSlug?: string
): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Send tenant slug so backend enforces tenant-scoped login
  if (tenantSlug) {
    headers["X-Tenant-Slug"] = tenantSlug;
  }

  const { data } = await api.post<LoginResponse>("/auth/token", formData.toString(), {
    headers,
  });
  return data;
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshTokenApi(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string }> {
  const { data } = await api.post<{
    access_token: string;
    refresh_token: string;
  }>("/auth/refresh", { refresh_token: refreshToken });
  return data;
}

/**
 * Request a password reset email.
 */
export async function forgotPasswordApi(
  email: string
): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>(
    "/auth/forgot-password",
    { email }
  );
  return data;
}

/**
 * Get the current authenticated user with org context.
 */
export async function getMe(): Promise<UserWithOrg> {
  const { data } = await api.get<UserWithOrg>("/auth/me");
  return data;
}

/**
 * Select an organization after login (when requires_org_selection is true).
 */
export async function selectOrgApi(
  orgId: string
): Promise<{ access_token: string; refresh_token: string }> {
  const { data } = await api.post<{
    access_token: string;
    refresh_token: string;
  }>("/auth/select-org", { org_id: orgId });
  return data;
}

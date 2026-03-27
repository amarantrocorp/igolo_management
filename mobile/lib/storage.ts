import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "igolo_access_token";
const REFRESH_KEY = "igolo_refresh_token";
const USER_KEY = "igolo_user_data";
const ORG_KEY = "igolo_active_org";
const ORG_SLUG_KEY = "igolo_active_org_slug";
const ORGS_KEY = "igolo_organizations";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
  await SecureStore.deleteItemAsync(ORG_KEY);
  await SecureStore.deleteItemAsync(ORG_SLUG_KEY);
  await SecureStore.deleteItemAsync(ORGS_KEY);
}

export async function getUserData(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_KEY);
}

export async function setUserData(data: string): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, data);
}

export async function getActiveOrgId(): Promise<string | null> {
  return SecureStore.getItemAsync(ORG_KEY);
}

export async function setActiveOrgId(orgId: string): Promise<void> {
  await SecureStore.setItemAsync(ORG_KEY, orgId);
}

export async function getActiveOrgSlug(): Promise<string | null> {
  return SecureStore.getItemAsync(ORG_SLUG_KEY);
}

export async function setActiveOrgSlug(slug: string): Promise<void> {
  await SecureStore.setItemAsync(ORG_SLUG_KEY, slug);
}

export async function getOrganizations(): Promise<string | null> {
  return SecureStore.getItemAsync(ORGS_KEY);
}

export async function setOrganizations(data: string): Promise<void> {
  await SecureStore.setItemAsync(ORGS_KEY, data);
}

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { Alert } from "react-native";
import { API_URL } from "./constants";
import {
  getToken,
  getActiveOrgSlug,
  getRefreshToken,
  setToken,
  setRefreshToken,
  clearTokens,
} from "./storage";
import { useAuthStore } from "../features/auth/store";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Bearer token and X-Tenant-ID header
api.interceptors.request.use(
  async (config) => {
    const [token, orgSlug] = await Promise.all([
      getToken(),
      getActiveOrgSlug(),
    ]);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Send tenant slug so the backend resolves the correct schema.
    // The web frontend derives this from the subdomain; on mobile we
    // read it from the persisted active-org data.
    if (orgSlug) {
      config.headers["X-Tenant-ID"] = orgSlug;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Response Interceptor: Token refresh on 401, org fallback on 403
// ---------------------------------------------------------------------------

// Mutex to prevent multiple concurrent refresh attempts (Fix #3)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ---- 401: Attempt token refresh before logging out (Fix #1 + #3) ----
    if (status === 401 && originalRequest && !originalRequest._retry) {
      // If the failing request was the refresh endpoint itself, don't retry —
      // just logout to avoid infinite loops.
      if (originalRequest.url?.includes("/auth/refresh")) {
        await clearTokens();
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = await getRefreshToken();

        if (!storedRefreshToken) {
          // No refresh token available — go straight to logout
          throw new Error("No refresh token");
        }

        // Call the refresh endpoint (imported from auth/api but using a raw
        // axios call to avoid the interceptor attaching the expired access
        // token and to avoid circular refresh loops).
        const { data } = await axios.post<{
          access_token: string;
          refresh_token: string;
        }>(`${API_URL}/auth/refresh`, {
          refresh_token: storedRefreshToken,
        });

        // Persist new tokens
        await Promise.all([
          setToken(data.access_token),
          setRefreshToken(data.refresh_token),
        ]);

        // Update in-memory store
        useAuthStore.setState({
          token: data.access_token,
          refreshToken: data.refresh_token,
        });

        // Resolve all queued requests with the new token
        processQueue(null, data.access_token);

        // Retry the original request with the fresh token
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear everything and force re-login
        processQueue(refreshError, null);
        await clearTokens();
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ---- 403: Org membership revoked / access denied (Fix #5 + #6) ----
    if (status === 403) {
      const detail: string =
        error.response?.data &&
        typeof (error.response.data as any).detail === "string"
          ? (error.response.data as any).detail
          : "";

      const orgs = useAuthStore.getState().organizations;
      const activeOrgId = useAuthStore.getState().activeOrgId;

      // Check if user has other orgs they can switch to
      const otherOrgs = orgs.filter((o) => o.org_id !== activeOrgId);

      if (otherOrgs.length > 0) {
        // User has other orgs — prompt to switch
        Alert.alert(
          "Access Revoked",
          detail ||
            "Your access to this organization has been revoked. You can switch to another organization.",
          [
            {
              text: "Switch Organization",
              onPress: () => {
                // Use expo-router's imperative API (works outside components)
                try {
                  const { router } = require("expo-router");
                  router.replace("/(auth)/org-selector");
                } catch {
                  // If router not available, logout so AuthGate handles it
                  useAuthStore.getState().logout();
                }
              },
            },
            {
              text: "Log Out",
              style: "destructive",
              onPress: () => {
                useAuthStore.getState().logout();
              },
            },
          ]
        );
      } else {
        // No other orgs — show message and stay
        Alert.alert(
          "Access Revoked",
          detail ||
            "Your access has been revoked. Contact your administrator.",
          [
            {
              text: "Log Out",
              onPress: () => {
                useAuthStore.getState().logout();
              },
            },
          ]
        );
      }
    }

    return Promise.reject(error);
  }
);

export default api;

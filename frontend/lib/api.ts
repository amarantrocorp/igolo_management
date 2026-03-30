import axios from "axios"
import { useAuthStore } from "@/store/auth-store"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request Interceptor: Attach Bearer token and X-Tenant-ID header
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Inject X-Tenant-ID from subdomain (for schema-per-tenant routing)
    // Only when subdomains are enabled (production); skip on localhost dev
    const useSubdomains = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === "true"
    if (useSubdomains && typeof window !== "undefined") {
      const hostname = window.location.hostname
      const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost"
      // Extract subdomain: "acme.site.com" → "acme"
      if (hostname !== baseDomain && hostname.endsWith(`.${baseDomain}`)) {
        const subdomain = hostname.replace(`.${baseDomain}`, "")
        if (subdomain && subdomain !== "www") {
          config.headers["X-Tenant-ID"] = subdomain
        }
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: Refresh access token on 401, then retry
let isRefreshing = false
let failedQueue: {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}[] = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token)
    else prom.reject(error)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only attempt refresh on 401, and not on the refresh endpoint itself
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/token")
    ) {
      return Promise.reject(error)
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          },
          reject: (err: unknown) => reject(err),
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    const refreshToken = useAuthStore.getState().refreshToken
    if (!refreshToken) {
      useAuthStore.getState().logout()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        { refresh_token: refreshToken }
      )

      // Update tokens in store
      const store = useAuthStore.getState()
      store.login(
        data.access_token,
        data.refresh_token,
        store.user!,
        store.activeOrgId ?? undefined,
        store.roleInOrg ?? undefined,
        store.organizations
      )

      // Resolve all queued requests with the new token
      processQueue(null, data.access_token)

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh failed — logout
      processQueue(refreshError, null)
      useAuthStore.getState().logout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api

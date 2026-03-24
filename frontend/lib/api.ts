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

// Response Interceptor: Auto-logout on 401 Unauthorized
// Only logout once to prevent multiple 401s from causing cascading reloads
let isLoggingOut = false
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isLoggingOut) {
      isLoggingOut = true
      useAuthStore.getState().logout()
      // DashboardShell will detect the missing token and redirect to /login
      // No need for window.location.href which causes full page reloads
      setTimeout(() => { isLoggingOut = false }, 2000)
    }
    return Promise.reject(error)
  }
)

export default api

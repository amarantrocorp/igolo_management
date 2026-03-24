import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Next.js Middleware for subdomain-based tenant routing.
 *
 * When a user visits `acme.site.com`, this middleware:
 * 1. Extracts the subdomain ("acme")
 * 2. Rewrites the URL internally to `/tenant/acme/...` routes
 * 3. The browser URL stays as `acme.site.com/dashboard`
 *
 * For the main domain (`site.com`), requests pass through normally.
 * Platform admin routes (`/dashboard/platform`) are never rewritten.
 */

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost"
const USE_SUBDOMAINS = process.env.NEXT_PUBLIC_USE_SUBDOMAINS === "true"

// Paths that should never be rewritten (static assets, API routes, platform admin)
const EXCLUDED_PATHS = [
  "/_next",
  "/favicon",
  "/api",
  "/dashboard/platform",
  "/accept-invite",
]

export function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") || ""
  const { pathname } = request.nextUrl

  // Skip excluded paths
  if (EXCLUDED_PATHS.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // When subdomains are disabled (local dev), pass through without tenant extraction
  if (!USE_SUBDOMAINS) {
    return NextResponse.next()
  }

  // Extract subdomain
  // For "acme.site.com" → subdomain = "acme"
  // For "acme.localhost:3000" → subdomain = "acme"
  let subdomain: string | null = null

  // Remove port for comparison
  const hostnameWithoutPort = hostname.split(":")[0]

  if (hostnameWithoutPort !== BASE_DOMAIN && hostnameWithoutPort !== "localhost") {
    // Check if it's a subdomain of our base domain
    if (hostnameWithoutPort.endsWith(`.${BASE_DOMAIN}`)) {
      subdomain = hostnameWithoutPort.replace(`.${BASE_DOMAIN}`, "")
    }
  }

  // For localhost development, check for tenant slug in a cookie or header
  // In production, subdomains work naturally

  if (!subdomain || subdomain === "www") {
    // Main domain — pass through normally
    return NextResponse.next()
  }

  // Tenant subdomain detected — add X-Tenant-ID header for downstream use
  const response = NextResponse.next()
  response.headers.set("X-Tenant-ID", subdomain)

  return response
}

export const config = {
  // Match all paths except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}

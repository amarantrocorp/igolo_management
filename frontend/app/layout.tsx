import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { Providers } from "./providers"
import { Toaster } from "@/components/ui/toaster"

const inter = localFont({
  src: [
    { path: "../public/fonts/Inter-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Inter-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Inter-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/Inter-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
})

const playfair = localFont({
  src: [
    { path: "../public/fonts/PlayfairDisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/PlayfairDisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/PlayfairDisplay-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/PlayfairDisplay-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
})

export const metadata: Metadata = {
  title: "Igolo Interior - Premium Interior Design",
  description: "Transform your spaces into stunning realities with Igolo Interior",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

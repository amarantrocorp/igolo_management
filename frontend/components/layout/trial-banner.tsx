"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import api from "@/lib/api"
import { X, ArrowRight } from "lucide-react"

interface BillingStatus {
  plan: string
  status: string
  trial_expires_at: string | null
  days_remaining: number | null
}

const DISMISS_KEY = "trial-banner-dismissed"

export default function TrialBanner() {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  useEffect(() => {
    // Only show if not dismissed this session
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY)
    setDismissed(!!wasDismissed)
  }, [])

  const { data: billing } = useQuery<BillingStatus>({
    queryKey: ["billing-status"],
    queryFn: async () => {
      const { data } = await api.get("/billing/current")
      return data
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    retry: false,
  })

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, "1")
  }

  // Only show for TRIAL status with days remaining
  if (
    dismissed ||
    !billing ||
    billing.status !== "TRIAL" ||
    billing.days_remaining == null
  ) {
    return null
  }

  const isUrgent = billing.days_remaining <= 3

  return (
    <div
      className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        isUrgent
          ? "bg-red-500 text-white"
          : "bg-amber-400 text-amber-950"
      }`}
    >
      <span>
        {billing.days_remaining === 0
          ? "Your free trial expires today."
          : `You have ${billing.days_remaining} day${billing.days_remaining === 1 ? "" : "s"} left in your free trial.`}
      </span>
      <Link
        href="/dashboard/billing"
        className={`inline-flex items-center gap-1 font-semibold underline underline-offset-2 ${
          isUrgent ? "text-white" : "text-amber-950"
        }`}
      >
        Upgrade now <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <button
        onClick={handleDismiss}
        className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors ${
          isUrgent
            ? "hover:bg-red-600"
            : "hover:bg-amber-500"
        }`}
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

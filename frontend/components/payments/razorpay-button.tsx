"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, CreditCard } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import api from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

// Razorpay is loaded dynamically via script tag
declare const Razorpay: any

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: RazorpayResponse) => void
  prefill: {
    name: string
    email: string
    contact: string
  }
  theme: {
    color: string
  }
  modal?: {
    ondismiss?: () => void
  }
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: () => void) => void
}

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

interface RazorpayButtonProps {
  projectId: string
  amount: number
  projectName?: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  description?: string
  onSuccess?: () => void
  disabled?: boolean
  className?: string
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function RazorpayButton({
  projectId,
  amount,
  projectName = "Project",
  clientName = "",
  clientEmail = "",
  clientPhone = "",
  description,
  onSuccess,
  disabled = false,
  className,
}: RazorpayButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handlePayment = useCallback(async () => {
    setIsLoading(true)

    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast({
          title: "Error",
          description:
            "Failed to load payment gateway. Please check your internet connection and try again.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // 2. Create order on backend
      const { data: order } = await api.post("/payments/create-order", {
        project_id: projectId,
        amount,
        description: description || `Payment for ${projectName}`,
      })

      // 3. Open Razorpay checkout
      const options: RazorpayOptions = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "IntDesignERP",
        description: description || `Payment for ${projectName}`,
        order_id: order.razorpay_order_id,
        handler: async (response: RazorpayResponse) => {
          try {
            // 4. Verify payment on backend
            const { data: verification } = await api.post(
              "/payments/verify",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                project_id: projectId,
                amount,
                description: description || `Payment for ${projectName}`,
              }
            )

            if (verification.success) {
              toast({
                title: "Payment Successful",
                description: `${formatCurrency(amount)} has been received. Your project wallet has been credited.`,
              })
              onSuccess?.()
            } else {
              toast({
                title: "Verification Failed",
                description:
                  verification.message ||
                  "Payment verification failed. Please contact support.",
                variant: "destructive",
              })
            }
          } catch {
            toast({
              title: "Verification Error",
              description:
                "Payment was processed but verification failed. Please contact your project manager.",
              variant: "destructive",
            })
          } finally {
            setIsLoading(false)
          }
        },
        prefill: {
          name: clientName,
          email: clientEmail,
          contact: clientPhone,
        },
        theme: {
          color: "#CBB282",
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on("payment.failed", () => {
        toast({
          title: "Payment Failed",
          description:
            "The payment could not be completed. Please try again or use a different payment method.",
          variant: "destructive",
        })
        setIsLoading(false)
      })
      rzp.open()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not initiate payment"
      toast({
        title: "Payment Error",
        description: message,
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }, [
    projectId,
    amount,
    projectName,
    clientName,
    clientEmail,
    clientPhone,
    description,
    onSuccess,
    toast,
  ])

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {isLoading ? "Processing..." : `Pay ${formatCurrency(amount)}`}
    </Button>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import { WizardStepper } from "./wizard-stepper"
import { WizardSidebar } from "./wizard-sidebar"
import { StartScreen } from "./start-screen"
import StepProject from "./steps/step-project"
import StepRooms from "./steps/step-rooms"
import StepItems from "./steps/step-items"
import { StepMaterials } from "./steps/step-materials"
import { StepAddons } from "./steps/step-addons"
import { StepPricing } from "./steps/step-pricing"
import { StepGenerate } from "./steps/step-generate"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Save,
} from "lucide-react"

function StepContent({ step }: { step: number }) {
  switch (step) {
    case 0:
      return <StartScreen />
    case 1:
      return <StepProject />
    case 2:
      return <StepRooms />
    case 3:
      return <StepItems />
    case 4:
      return <StepMaterials />
    case 5:
      return <StepAddons />
    case 6:
      return <StepPricing />
    case 7:
      return <StepGenerate />
    default:
      return null
  }
}

const STEP_TITLES = [
  "",
  "Step 1 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
  "Step 2 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
  "Step 3 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
  "Step 4 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
  "Step 5 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
  "Step 6 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
  "Step 7 of 7 \u2014 Auto-calculate scope, quantity, and pricing",
]

export function WizardShell() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    currentStep,
    goToStep,
    nextStep,
    prevStep,
    resetWizard,
  } = useQuoteWizardStore()

  function handleNextClick() {
    const s = useQuoteWizardStore.getState()
    if (s.currentStep === 1) {
      if (!s.projectDetails.clientName.trim()) {
        toast({ title: "Required", description: "Enter client name" })
        return
      }
      if (!s.projectDetails.propertyType) {
        toast({ title: "Required", description: "Select property type" })
        return
      }
      if (!s.projectDetails.packageType) {
        toast({ title: "Required", description: "Select a package" })
        return
      }
    }
    if (s.currentStep === 2) {
      if (s.rooms.length === 0) {
        toast({ title: "Required", description: "Select at least one room" })
        return
      }
    }
    if (s.currentStep === 3) {
      const hasItems = s.rooms.some((r) => r.selectedItemKeys.length > 0)
      if (!hasItems) {
        toast({ title: "Required", description: "Select at least one item" })
        return
      }
    }
    if (s.currentStep === 6) {
      const d = Number(s.discount.flatPercent)
      if (d < 0 || d > 100) {
        toast({ title: "Invalid", description: "Discount must be between 0% and 100%" })
        return
      }
    }
    nextStep()
  }

  // Reset wizard on mount
  useEffect(() => {
    resetWizard()
  }, [resetWizard])

  const isStartScreen = currentStep === 0
  const isLastStep = currentStep === 7

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b px-1 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (currentStep > 0) {
                prevStep()
              } else {
                router.push("/dashboard/sales/quotes")
              }
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">New Smart Quotation</h1>
            <p className="text-xs text-muted-foreground">
              {isStartScreen ? "Choose how to start" : STEP_TITLES[currentStep]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStartScreen && (
            <>
              <Button variant="outline" size="sm" disabled>
                <Lightbulb className="mr-2 h-4 w-4" />
                Advanced Mode
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stepper */}
      {!isStartScreen && (
        <div className="border-b px-4 py-2">
          <WizardStepper currentStep={currentStep} onStepClick={goToStep} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex">
        {/* Content */}
        <div className={`flex-1 ${!isStartScreen && !isLastStep ? "min-w-0" : ""}`}>
          <div className={`mx-auto ${isStartScreen ? "max-w-3xl py-12" : "max-w-4xl p-6"}`}>
            <StepContent step={currentStep} />
          </div>

          {/* Footer Navigation */}
          {!isStartScreen && (
            <div className="sticky bottom-0 border-t bg-white px-6 py-3">
              <div className="mx-auto flex max-w-4xl items-center justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep <= 1}
                >
                  Previous
                </Button>
                {!isLastStep && (
                  <Button onClick={handleNextClick}>
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {!isStartScreen && (
          <div className="hidden xl:block">
            <WizardSidebar />
          </div>
        )}
      </div>
    </div>
  )
}

"use client"

import { Check, ChevronRight } from "lucide-react"

const STEPS = [
  { num: 1, label: "Project" },
  { num: 2, label: "Rooms" },
  { num: 3, label: "Items" },
  { num: 4, label: "Materials" },
  { num: 5, label: "Add-ons" },
  { num: 6, label: "Pricing" },
  { num: 7, label: "Generate" },
]

interface WizardStepperProps {
  currentStep: number
  onStepClick: (step: number) => void
}

export function WizardStepper({ currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.num
        const isActive = currentStep === step.num
        const isClickable = step.num <= currentStep

        return (
          <div key={step.num} className="flex items-center">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.num)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isCompleted
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground"
              } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? "bg-white text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step.num}
                </span>
              )}
              {step.label}
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 mx-0.5 flex-shrink-0" />
            )}
          </div>
        )
      })}
    </div>
  )
}

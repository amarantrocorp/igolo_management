"use client"

import { useState } from "react"
import { Plus, Upload, Copy, Library, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useQuoteWizardStore } from "@/store/quote-wizard-store"
import type { WizardEntryMode, PropertyType } from "@/types/quote-wizard"
import { cn } from "@/lib/utils"
import { UploadLayoutDialog } from "./upload-layout-dialog"
import { ReuseQuoteDialog } from "./reuse-quote-dialog"

interface OptionCard {
  key: WizardEntryMode
  icon: React.ElementType
  title: string
  subtitle: string
  disabled?: boolean
  disabledLabel?: string
}

const OPTIONS: OptionCard[] = [
  {
    key: "scratch",
    icon: Plus,
    title: "Start From Scratch",
    subtitle: "Build a quotation step by step with full control",
  },
  {
    key: "upload",
    icon: Upload,
    title: "Upload Layout Plan",
    subtitle: "Upload a floor plan to auto-populate rooms",
  },
  {
    key: "template",
    icon: Copy,
    title: "Use Template",
    subtitle: "Start from a pre-built quotation template (Standard 3BHK Package)",
  },
  {
    key: "reuse",
    icon: Library,
    title: "Reuse Previous Quotation",
    subtitle: "Clone and modify an existing quotation",
  },
]

export function StartScreen() {
  const store = useQuoteWizardStore()
  const setEntryMode = store.setEntryMode
  const updateProjectDetails = store.updateProjectDetails
  const selectStandardRooms = store.selectStandardRooms
  const [selected, setSelected] = useState<WizardEntryMode>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [reuseDialogOpen, setReuseDialogOpen] = useState(false)

  function handleCardClick(key: WizardEntryMode) {
    if (key === "upload") {
      setSelected(key)
      setUploadDialogOpen(true)
      return
    }

    if (key === "reuse") {
      setSelected(key)
      setReuseDialogOpen(true)
      return
    }

    if (key === "template") {
      // Pre-fill with Standard 3BHK Package and navigate to step 1
      updateProjectDetails({
        projectName: "Standard 3BHK Package",
        propertyType: "3BHK" as PropertyType,
        packageType: "STANDARD",
        budgetRange: "10-15L",
      })
      // Select standard rooms for 3BHK after setting property type
      setTimeout(() => {
        selectStandardRooms()
      }, 0)
      setEntryMode("template")
      return
    }

    setSelected(key)
  }

  function handleContinue() {
    if (!selected) return
    if (selected === "scratch") {
      store.resetWizard()
    }
    setEntryMode(selected)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Create a New Quotation
        </h2>
        <p className="text-muted-foreground">
          Choose how you would like to get started
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          const isSelected = selected === opt.key
          const isDisabled = opt.disabled

          return (
            <button
              key={opt.key}
              type="button"
              disabled={isDisabled}
              onClick={() => handleCardClick(opt.key)}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-lg border p-6 text-center transition-all",
                "hover:border-primary/50 hover:shadow-sm",
                isSelected &&
                  "border-primary bg-primary/5 ring-1 ring-primary/20",
                isDisabled &&
                  "cursor-not-allowed opacity-60 hover:border-border hover:shadow-none"
              )}
            >
              {isDisabled && opt.disabledLabel && (
                <span className="absolute right-3 top-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {opt.disabledLabel}
                </span>
              )}

              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border bg-muted/50",
                  isSelected && "border-primary/30 bg-primary/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 text-muted-foreground",
                    isSelected && "text-primary"
                  )}
                />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-semibold">{opt.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {opt.subtitle}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {selected && selected !== "upload" && selected !== "reuse" && selected !== "template" && (
        <div className="flex justify-center">
          <Button onClick={handleContinue} size="lg" className="gap-2">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <UploadLayoutDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <ReuseQuoteDialog
        open={reuseDialogOpen}
        onOpenChange={setReuseDialogOpen}
      />
    </div>
  )
}

"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Plus, X, Loader2, ImageIcon } from "lucide-react"

interface MultiFileUploadProps {
  value?: string[]
  onChange: (urls: string[]) => void
  category: string
  accept?: string
  maxSizeMB?: number
  maxFiles?: number
  label?: string
  className?: string
}

export function MultiFileUpload({
  value = [],
  onChange,
  category,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeMB = 10,
  maxFiles = 5,
  label = "Upload Files",
  className,
}: MultiFileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null)

      if (value.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed.`)
        return
      }

      const maxBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        setError(`File too large. Maximum size is ${maxSizeMB} MB.`)
        return
      }

      const acceptedTypes = accept.split(",").map((t) => t.trim())
      if (!acceptedTypes.includes(file.type)) {
        setError("File type not allowed.")
        return
      }

      setUploading(true)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await api.post("/upload", formData, {
          params: { category },
          headers: { "Content-Type": "multipart/form-data" },
        })

        onChange([...value, response.data.url])
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Upload failed. Please try again."
        setError(msg)
      } finally {
        setUploading(false)
      }
    },
    [accept, category, maxFiles, maxSizeMB, onChange, value]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleUpload]
  )

  const handleRemove = useCallback(
    (index: number) => {
      const updated = value.filter((_, i) => i !== index)
      onChange(updated)
      setError(null)
    },
    [onChange, value]
  )

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium">{label}</p>}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {value.map((url, index) => (
          <div key={url} className="group relative">
            <img
              src={url}
              alt={`Upload ${index + 1}`}
              className="h-24 w-full rounded-md border object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < maxFiles && (
          <button
            type="button"
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className="flex h-24 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Plus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add</span>
              </>
            )}
          </button>
        )}
      </div>

      {value.length === 0 && !uploading && (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 hover:border-primary/50 transition-colors"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium">Add photos</p>
            <p className="text-xs text-muted-foreground mt-1">
              Up to {maxFiles} files, max {maxSizeMB} MB each
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

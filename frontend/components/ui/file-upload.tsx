"use client"

import * as React from "react"
import { useCallback, useRef, useState } from "react"
import api from "@/lib/api"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Upload, X, FileText, Loader2, ImageIcon } from "lucide-react"

interface FileUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  category: string
  accept?: string
  maxSizeMB?: number
  label?: string
  required?: boolean
  compact?: boolean
  className?: string
}

export function FileUpload({
  value,
  onChange,
  category,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeMB = 10,
  label = "Upload File",
  required = false,
  compact = false,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isImage = value && /\.(jpg|jpeg|png|webp|gif)$/i.test(value)
  const isPdf = value && /\.pdf$/i.test(value)

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null)

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
      setProgress(0)

      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await api.post("/upload", formData, {
          params: { category },
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((e.loaded * 100) / e.total))
            }
          },
        })

        onChange(response.data.url)
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || "Upload failed. Please try again."
        setError(msg)
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [accept, category, maxSizeMB, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleUpload(file)
    },
    [handleUpload]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file)
      if (inputRef.current) inputRef.current.value = ""
    },
    [handleUpload]
  )

  const handleRemove = useCallback(() => {
    onChange(null)
    setError(null)
  }, [onChange])

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {value ? (
          <div className="relative">
            {isImage ? (
              <img
                src={value}
                alt="Upload"
                className="h-12 w-12 rounded-full object-cover border"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
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

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <p className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </p>
      )}

      {value ? (
        <div className="relative rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            {isImage ? (
              <img
                src={value}
                alt="Preview"
                className="h-20 w-20 rounded-md object-cover border"
              />
            ) : isPdf ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground truncate">
                {value.split("/").pop()}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
            uploading && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading... {progress}%
              </p>
              <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max {maxSizeMB} MB
                </p>
              </div>
            </>
          )}
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

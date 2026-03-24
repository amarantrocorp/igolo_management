"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { MapPin, Loader2, X } from "lucide-react"

// ── Script loader (singleton) ──

let scriptPromise: Promise<void> | null = null
let scriptLoaded = false

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (scriptLoaded) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    // Check if already loaded by another source
    if (window.google?.maps?.places) {
      scriptLoaded = true
      resolve()
      return
    }

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      scriptLoaded = true
      resolve()
    }
    script.onerror = () => {
      scriptPromise = null
      reject(new Error("Failed to load Google Maps script"))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

// ── Types ──

export interface PlaceResult {
  address: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  lat?: number
  lng?: number
  placeId?: string
}

interface PlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect?: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  error?: boolean
  /** Restrict to country codes e.g. ["in"] for India */
  countryRestrictions?: string[]
  /** Types of results: "geocode" | "address" | "establishment" | "(regions)" | "(cities)" */
  types?: string[]
}

export function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a location...",
  className,
  error,
  countryRestrictions = ["in"],
  types = ["geocode", "establishment"],
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Load script
  useEffect(() => {
    if (!apiKey) {
      // No API key — component works as plain input
      return
    }

    loadGoogleMapsScript(apiKey)
      .then(() => setReady(true))
      .catch(() => setLoadError(true))
  }, [apiKey])

  // Initialize autocomplete
  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types,
      componentRestrictions: countryRestrictions.length > 0 ? { country: countryRestrictions } : undefined,
      fields: ["formatted_address", "address_components", "geometry", "place_id", "name"],
    })

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace()
      if (!place.formatted_address && !place.name) return

      const address = place.formatted_address || place.name || ""
      onChange(address)

      if (onPlaceSelect) {
        const components = place.address_components || []

        const getComponent = (type: string) =>
          components.find((c) => c.types.includes(type))?.long_name

        onPlaceSelect({
          address,
          city: getComponent("locality") || getComponent("sublocality_level_1"),
          state: getComponent("administrative_area_level_1"),
          country: getComponent("country"),
          postalCode: getComponent("postal_code"),
          lat: place.geometry?.location?.lat(),
          lng: place.geometry?.location?.lng(),
          placeId: place.place_id,
        })
      }
    })

    autocompleteRef.current = autocomplete

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
    // Only run once when ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const handleClear = useCallback(() => {
    onChange("")
    inputRef.current?.focus()
  }, [onChange])

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-8 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-300 focus-visible:ring-red-500",
          className
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {apiKey && !ready && !loadError && (
        <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  )
}

"use client"

import { useState, useCallback } from "react"
import { MapPin, Navigation } from "lucide-react"
import { PlacesAutocomplete, type PlaceResult } from "@/components/ui/places-autocomplete"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  address: string
  onLocationChange: (lat: number, lng: number, address: string) => void
  radiusMeters?: number
  className?: string
  /** If true, show a compact inline view */
  compact?: boolean
}

export function LocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  radiusMeters = 500,
  className,
  compact = false,
}: LocationPickerProps) {
  const [searchAddress, setSearchAddress] = useState(address)
  const [manualLat, setManualLat] = useState(latitude?.toString() ?? "")
  const [manualLng, setManualLng] = useState(longitude?.toString() ?? "")

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const handlePlaceSelect = useCallback(
    (place: PlaceResult) => {
      if (place.lat != null && place.lng != null) {
        setManualLat(place.lat.toString())
        setManualLng(place.lng.toString())
        onLocationChange(place.lat, place.lng, place.address)
      }
    },
    [onLocationChange]
  )

  const handleManualUpdate = useCallback(() => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onLocationChange(lat, lng, searchAddress || `${lat}, ${lng}`)
    }
  }, [manualLat, manualLng, searchAddress, onLocationChange])

  const hasValidCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)

  // Build Google Maps embed URL
  const mapEmbedUrl = hasValidCoords && apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=16`
    : null

  // Google Maps link (works without API key too)
  const mapsLink = hasValidCoords
    ? `https://www.google.com/maps?q=${latitude},${longitude}`
    : null

  return (
    <div className={className}>
      {/* Search bar */}
      <div className="space-y-3">
        <div>
          <Label className="text-sm font-medium">Search Location</Label>
          <div className="mt-1">
            <PlacesAutocomplete
              value={searchAddress}
              onChange={setSearchAddress}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search for project site address..."
              countryRestrictions={["in"]}
            />
          </div>
        </div>

        {/* Map embed */}
        {mapEmbedUrl && !compact && (
          <div className="rounded-lg overflow-hidden border">
            <iframe
              src={mapEmbedUrl}
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Project location map"
            />
          </div>
        )}

        {/* Lat/Lng fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 12.9716"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              onBlur={handleManualUpdate}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              type="number"
              step="any"
              placeholder="e.g. 77.5946"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              onBlur={handleManualUpdate}
              className="mt-1"
            />
          </div>
        </div>

        {/* Radius display */}
        {hasValidCoords && radiusMeters > 0 && (
          <p className="text-xs text-muted-foreground">
            Geofence radius: {radiusMeters}m
          </p>
        )}

        {/* Current location summary */}
        {hasValidCoords && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span className="truncate flex-1">
              {address || `${latitude?.toFixed(6)}, ${longitude?.toFixed(6)}`}
            </span>
            {mapsLink && (
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
              >
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2">
                  <Navigation className="h-3 w-3 mr-1" />
                  Open
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Static display of a project location (no editing).
 */
export function LocationDisplay({
  latitude,
  longitude,
  address,
  className,
}: {
  latitude: number | null
  longitude: number | null
  address?: string | null
  className?: string
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const hasCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)

  if (!hasCoords) return null

  const mapEmbedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=16`
    : null

  const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`

  return (
    <div className={className}>
      {mapEmbedUrl && (
        <div className="rounded-lg overflow-hidden border mb-2">
          <iframe
            src={mapEmbedUrl}
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Project location"
          />
        </div>
      )}
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <span className="truncate flex-1">
          {address || `${latitude?.toFixed(6)}, ${longitude?.toFixed(6)}`}
        </span>
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2">
            <Navigation className="h-3 w-3 mr-1" />
            Open in Maps
          </Button>
        </a>
      </div>
    </div>
  )
}

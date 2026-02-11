"use client"

import type { Lead } from "@/types"
import type { QuoteRoomForm } from "@/types/quote"
import { calcItemTotal, calcRoomTotal, formatINR } from "@/types/quote"
import { FileText } from "lucide-react"

interface QuotePreviewProps {
  leadId: string
  validUntil: string
  rooms: QuoteRoomForm[]
  leads: Lead[]
  notes?: string
  // Optional overrides when showing a saved quote (view page)
  clientName?: string
  clientPhone?: string
  quoteNumber?: string
  quoteDate?: string
  version?: number
}

export default function QuotePreview({
  leadId,
  validUntil,
  rooms,
  leads,
  notes,
  clientName,
  clientPhone,
  quoteNumber,
  quoteDate,
  version,
}: QuotePreviewProps) {
  const lead = leads.find((l) => l.id === leadId)
  const resolvedName = clientName || lead?.name || "—"
  const resolvedPhone = clientPhone || lead?.contact_number
  const grandTotal = rooms.reduce((sum, r) => sum + calcRoomTotal(r), 0)
  const hasContent = rooms.some(
    (r) => r.name.trim() || r.items.some((i) => i.description.trim())
  )
  const today = quoteDate || new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  // Numbering helper for items across all rooms
  let globalItemIndex = 0

  return (
    <div id="quote-preview-printable" className="quote-preview-paper">
      {/* ── Header Band ── */}
      <div className="quote-header">
        <div className="quote-header-left">
          <div className="quote-company-logo">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="quote-company-name">Igolo Interior</h1>
            <p className="quote-company-tagline">Design Studio & Execution</p>
          </div>
        </div>
        <div className="quote-header-right">
          <span className="quote-doc-label">QUOTATION</span>
        </div>
      </div>

      {/* ── Meta Strip ── */}
      <div className="quote-meta-strip">
        <div className="quote-meta-grid">
          <div>
            <span className="quote-meta-label">Prepared For</span>
            <span className="quote-meta-value">{resolvedName}</span>
            {resolvedPhone && (
              <span className="quote-meta-sub">{resolvedPhone}</span>
            )}
          </div>
          <div>
            <span className="quote-meta-label">Date</span>
            <span className="quote-meta-value">{today}</span>
          </div>
          <div>
            <span className="quote-meta-label">Valid Until</span>
            <span className="quote-meta-value">
              {validUntil
                ? new Date(validUntil).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </span>
          </div>
          <div>
            <span className="quote-meta-label">Quote No.</span>
            <span className="quote-meta-value">
              {quoteNumber || "DRAFT"}
            </span>
            {version != null && (
              <span className="quote-meta-sub">Version {version}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="quote-body">
        {!hasContent ? (
          <div className="quote-empty">
            <FileText className="h-12 w-12 text-gray-300" />
            <p className="quote-empty-title">Live Preview</p>
            <p className="quote-empty-sub">
              Start adding rooms and items on the left to see your quotation
              come to life here.
            </p>
          </div>
        ) : (
          <>
            {/* Room-wise breakdown */}
            {rooms.map((room, ri) => {
              const roomTotal = calcRoomTotal(room)
              const roomHasContent =
                room.name.trim() ||
                room.items.some((i) => i.description.trim())
              if (!roomHasContent) return null

              return (
                <div key={room.id} className="quote-room-section">
                  {/* Room title bar */}
                  <div className="quote-room-title-bar">
                    <span className="quote-room-name">
                      {room.name || `Room ${ri + 1}`}
                    </span>
                    {room.area_sqft && (
                      <span className="quote-room-area">
                        {room.area_sqft} sqft
                      </span>
                    )}
                  </div>

                  {/* Items table */}
                  <table className="quote-table">
                    <thead>
                      <tr>
                        <th className="quote-th quote-th-num">#</th>
                        <th className="quote-th quote-th-desc">Description</th>
                        <th className="quote-th quote-th-right">Qty</th>
                        <th className="quote-th quote-th-right">Unit</th>
                        <th className="quote-th quote-th-right">Rate</th>
                        <th className="quote-th quote-th-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {room.items.map((item) => {
                        if (!item.description.trim() && !item.unit_price)
                          return null
                        globalItemIndex++
                        const total = calcItemTotal(item)
                        return (
                          <tr
                            key={item.id}
                            className={
                              globalItemIndex % 2 === 0
                                ? "quote-tr-even"
                                : "quote-tr-odd"
                            }
                          >
                            <td className="quote-td quote-td-num">
                              {globalItemIndex}
                            </td>
                            <td className="quote-td quote-td-desc">
                              {item.description || "—"}
                            </td>
                            <td className="quote-td quote-td-right">
                              {parseFloat(item.quantity) || 0}
                            </td>
                            <td className="quote-td quote-td-right">
                              {item.unit}
                            </td>
                            <td className="quote-td quote-td-right">
                              {formatINR(parseFloat(item.unit_price) || 0)}
                            </td>
                            <td className="quote-td quote-td-right quote-td-amount">
                              {formatINR(total)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="quote-room-total-row">
                        <td
                          colSpan={5}
                          className="quote-td quote-room-total-label"
                        >
                          {room.name || `Room ${ri + 1}`} — Subtotal
                        </td>
                        <td className="quote-td quote-td-right quote-room-total-value">
                          {formatINR(roomTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })}

            {/* ── Grand Total ── */}
            <div className="quote-grand-total">
              <div className="quote-grand-total-inner">
                <span className="quote-grand-total-label">Grand Total</span>
                <span className="quote-grand-total-value">
                  {formatINR(grandTotal)}
                </span>
              </div>
            </div>

            {/* ── Notes ── */}
            {notes && (
              <div className="quote-notes">
                <h4 className="quote-notes-title">Notes</h4>
                <p className="quote-notes-body">{notes}</p>
              </div>
            )}

            {/* ── Terms ── */}
            <div className="quote-terms">
              <h4 className="quote-terms-title">Terms & Conditions</h4>
              <ol className="quote-terms-list">
                <li>
                  This quotation is valid for the period mentioned above.
                </li>
                <li>
                  50% advance payment is required to confirm the order.
                </li>
                <li>
                  Prices are inclusive of material and labor unless stated
                  otherwise.
                </li>
                <li>
                  Any additional work beyond this scope will be billed
                  separately via a Variation Order.
                </li>
                <li>
                  Timelines are subject to site readiness and material
                  availability.
                </li>
              </ol>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="quote-footer">
        <div className="quote-footer-left">
          <span>Igolo Interior Design Studio</span>
          <span>contact@igolo.in</span>
        </div>
        <div className="quote-footer-right">
          <span>Confidential</span>
        </div>
      </div>
    </div>
  )
}

"use client"

/**
 * components/slots/SlotSelectionPanel.jsx
 * Orchestrating panel: slot picker → price breakdown → proceed to payment
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { SlotGrid } from "./slotGrid"
import { useSlotAvailability, SLOT_STATUS } from "@/lib/hooks/useSlotAvailability"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Car, Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  IndianRupee, Zap, Accessibility, Info, WifiOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const SLOT_TYPE_LABELS = {
  standard:   { label: "Standard",    surcharge: 0,   Icon: Car          },
  compact:    { label: "Compact",     surcharge: -10, Icon: Car          },
  accessible: { label: "Accessible",  surcharge: 0,   Icon: Accessibility },
  ev:         { label: "EV Charging", surcharge: 30,  Icon: Zap          },
}

const HOLD_TTL_S = 10 * 60

// ── Countdown timer ────────────────────────────────────────────────────────────
function HoldTimer({ heldAt }) {
  const [remaining, setRemaining] = useState(HOLD_TTL_S)

  const intervalRef = useRef(null)
  useEffect(() => {
    if (heldAt) {
      const initial = Math.max(0, HOLD_TTL_S - Math.floor((Date.now() - heldAt) / 1000))
      setRemaining(initial)
    } else {
      setRemaining(HOLD_TTL_S)
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const mins   = Math.floor(remaining / 60)
  const secs   = remaining % 60
  const pct    = (remaining / HOLD_TTL_S) * 100
  const urgent = remaining < 60

  return (
    <div className={cn("flex items-center gap-2 text-xs", urgent ? "text-red-400" : "text-amber-400")}>
      <div className="relative w-5 h-5 shrink-0">
        <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
          <circle
            cx="10" cy="10" r="8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${2 * Math.PI * 8}`}
            strokeDashoffset={`${2 * Math.PI * 8 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
      </div>
      <span className="font-mono font-semibold tabular-nums">
        {mins}:{String(secs).padStart(2, "0")} hold remaining
      </span>
    </div>
  )
}

// ── Selected slot summary ──────────────────────────────────────────────────────
function SelectedSlotSummary({ slot, basePrice, onRelease }) {
  if (!slot) return null

  const { label, surcharge, Icon } = SLOT_TYPE_LABELS[slot.type] || SLOT_TYPE_LABELS.standard
  const finalPrice = basePrice + surcharge

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Slot {slot.slotNumber}</p>
            <p className="text-xs text-slate-400">{label} · {slot.floor} Floor</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-white flex items-center justify-end gap-0.5">
            <IndianRupee className="w-3 h-3" />
            {finalPrice}
            <span className="text-xs font-normal text-slate-400">/hr</span>
          </p>
          {surcharge !== 0 && (
            <p className={cn("text-[10px]", surcharge > 0 ? "text-amber-400" : "text-emerald-400")}>
              {surcharge > 0 ? `+₹${surcharge}` : `₹${surcharge}`} surcharge
            </p>
          )}
        </div>
      </div>

      {slot.expiresAt && <HoldTimer heldAt={slot.expiresAt - HOLD_TTL_S * 1000} />}

      <button
        onClick={onRelease}
        className="text-[10px] text-slate-500 hover:text-red-400 transition-colors underline-offset-2 hover:underline"
      >
        Release this slot
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function SlotSelectionPanel({ plot, bookingDate, duration, userId, onProceed }) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(true)

  const {
    slots, loading, error,
    selectedSlotKey, stats,
    holdSlot, releaseSlot, confirmBooking,
  } = useSlotAvailability({
    plotId:     plot?.id,
    date:       bookingDate,
    totalSlots: plot?.totalSlots || 20,
    userId,
  })

  const selectedSlot = selectedSlotKey ? slots[selectedSlotKey] : null

  const typeConfig   = selectedSlot
    ? (SLOT_TYPE_LABELS[selectedSlot.type] || SLOT_TYPE_LABELS.standard)
    : null
  const surcharge    = typeConfig?.surcharge || 0
  const pricePerHour = (plot?.price || 0) + surcharge
  const totalPrice   = pricePerHour * (duration || 1)

  const handleSlotClick = useCallback(async (slotKey) => {
    if (slotKey === selectedSlotKey) {
      await releaseSlot(slotKey)
      return
    }
    const result = await holdSlot(slotKey)
    if (!result.success) {
      toast({
        variant: "destructive",
        title: "Slot unavailable",
        description: result.error || "Someone just grabbed that slot.",
      })
      return
    }

    const selectedNow = slots?.[slotKey]
    if (selectedNow) {
      onProceed?.({
        slotKey,
        slot: selectedNow,
        totalPrice,
        pricePerHour,
        confirmBooking,
      })
    }
  }, [selectedSlotKey, holdSlot, releaseSlot, toast, slots, totalPrice, pricePerHour, confirmBooking, onProceed])

  const handleProceed = useCallback(() => {
    if (!selectedSlot || !selectedSlotKey) return
    onProceed?.({ slotKey: selectedSlotKey, slot: selectedSlot, totalPrice, pricePerHour, confirmBooking })
  }, [selectedSlot, selectedSlotKey, totalPrice, pricePerHour, confirmBooking, onProceed])

  if (!plot) return null

  if (error?.includes("Realtime database not available")) {
    return (
      <Alert variant="destructive">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>
          Real-time slot selection is unavailable. Please enable Firebase Realtime Database and ensure{" "}
          <code className="text-xs">databaseURL</code> is set in your Firebase config.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden">
      {/* Header toggle */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-900/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-900/50 border border-emerald-700/60 flex items-center justify-center">
            <Car className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Select Your Slot</p>
            <p className="text-xs text-slate-400">
              {loading ? "Loading slots…" : `${stats.available} of ${stats.total} available`}
              {bookingDate && !loading && (
                <> · {format(bookingDate, "dd MMM yyyy")}</>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedSlotKey && (
            <Badge className="bg-emerald-900/60 text-emerald-300 border-emerald-700/50 text-[10px]">
              Slot {selectedSlot?.slotNumber} selected
            </Badge>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </div>
      </button>

      {expanded && (
        <div className="overflow-hidden">
            <div className="px-5 pb-5 space-y-5">
              {/* Slot grid */}
              <div className="overflow-x-auto">
                <SlotGrid
                  slots={slots}
                  loading={loading}
                  error={error}
                  selectedSlotKey={selectedSlotKey}
                  stats={stats}
                  userId={userId}
                  onSlotClick={handleSlotClick}
                  slotsPerRow={10}
                />
              </div>

              {/* Selected slot summary */}
              {selectedSlot && (
                <SelectedSlotSummary
                  key={selectedSlotKey}
                  slot={selectedSlot}
                  basePrice={plot.price || 0}
                  onRelease={() => releaseSlot(selectedSlotKey)}
                />
              )}

              {/* Price breakdown */}
              {selectedSlot && (
                <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    Price Breakdown
                  </p>
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>₹{plot.price}/hr × {duration} hr{duration > 1 ? "s" : ""}</span>
                    <span>₹{plot.price * duration}</span>
                  </div>
                  {surcharge !== 0 && (
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>{typeConfig?.label} surcharge × {duration} hr{duration > 1 ? "s" : ""}</span>
                      <span className={surcharge > 0 ? "text-amber-400" : "text-emerald-400"}>
                        {surcharge > 0 ? "+" : ""}₹{surcharge * duration}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                    <span>Total</span>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {totalPrice}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA */}
              <Button
                className="w-full h-12 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!selectedSlot || loading}
                onClick={handleProceed}
              >
                {loading ? (
                  <><Clock className="w-4 h-4 mr-2 animate-spin" />Loading slots…</>
                ) : !selectedSlot ? (
                  <><Info className="w-4 h-4 mr-2 opacity-70" />Select a slot to continue</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Proceed to Payment · ₹{totalPrice}</>
                )}
              </Button>

              <p className="text-center text-[10px] text-slate-600">
                Slot held for 10 minutes · Live availability updates
              </p>
            </div>
          </div>
        )}
    </div>
  )
}
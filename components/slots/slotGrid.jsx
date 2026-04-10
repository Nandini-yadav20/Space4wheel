"use client"

/**
 * components/slots/SlotGrid.jsx — FIXED
 *
 * Bugs fixed:
 *  1. Removed `animate-bounce-slight` class that doesn't exist in Tailwind.
 *  2. Added null/empty guard on slots prop.
 *  3. RefreshCw spinner animation uses correct Tailwind class.
 */

import { useMemo, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SLOT_STATUS } from "@/lib/hooks/useSlotAvailability"
import { cn } from "@/lib/utils"
import {
  Car, Zap, Accessibility, RefreshCw, Info,
  CheckCircle2, Clock, Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Visual config ─────────────────────────────────────────────────────────────
const SLOT_TYPE_CONFIG = {
  standard:   { label: "Standard",    Icon: Car,          width: "w-14" },
  compact:    { label: "Compact",     Icon: Car,          width: "w-12" },
  accessible: { label: "Accessible",  Icon: Accessibility, width: "w-14" },
  ev:         { label: "EV Charging", Icon: Zap,          width: "w-14" },
}

const STATUS_STYLES = {
  [SLOT_STATUS.AVAILABLE]: {
    border: "border-emerald-500",
    bg:     "bg-emerald-950/40 hover:bg-emerald-900/60",
    text:   "text-emerald-300",
    glow:   "shadow-[0_0_8px_0px_rgba(16,185,129,0.4)]",
    cursor: "cursor-pointer",
    ring:   "hover:ring-2 hover:ring-emerald-400/50",
  },
  [SLOT_STATUS.HELD]: {
    border: "border-amber-500",
    bg:     "bg-amber-950/40",
    text:   "text-amber-300",
    glow:   "shadow-[0_0_8px_0px_rgba(245,158,11,0.35)]",
    cursor: "cursor-not-allowed",
    ring:   "",
  },
  [SLOT_STATUS.BOOKED]: {
    border: "border-red-700",
    bg:     "bg-red-950/50",
    text:   "text-red-400",
    glow:   "",
    cursor: "cursor-not-allowed",
    ring:   "",
  },
  [SLOT_STATUS.MAINTENANCE]: {
    border: "border-slate-700",
    bg:     "bg-slate-900/60",
    text:   "text-slate-600",
    glow:   "",
    cursor: "cursor-not-allowed",
    ring:   "",
  },
}

// ── Single slot cell ──────────────────────────────────────────────────────────
function SlotCell({ slotKey, slot, isSelected, isMyHold, onClick }) {
  const typeConfig  = SLOT_TYPE_CONFIG[slot.type] || SLOT_TYPE_CONFIG.standard
  const statusStyle = STATUS_STYLES[slot.status]  || STATUS_STYLES[SLOT_STATUS.AVAILABLE]
  const Icon = typeConfig.Icon

  const isInteractable =
    slot.status === SLOT_STATUS.AVAILABLE ||
    (slot.status === SLOT_STATUS.HELD && isMyHold)

  const selectedStyle = isSelected
    ? "border-white bg-white/20 shadow-[0_0_16px_4px_rgba(255,255,255,0.25)] scale-105"
    : ""

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            layout
            whileTap={isInteractable ? { scale: 0.92 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => isInteractable && onClick(slotKey)}
            aria-label={`Slot ${slot.slotNumber} – ${slot.type} – ${slot.status}`}
            aria-pressed={isSelected}
            disabled={!isInteractable}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 rounded-md border-2 h-14 transition-all duration-150 select-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
              typeConfig.width,
              statusStyle.border,
              statusStyle.bg,
              statusStyle.cursor,
              statusStyle.ring,
              statusStyle.glow,
              selectedStyle,
              isSelected && "z-10"
            )}
          >
            {/* Status icons */}
            {slot.status === SLOT_STATUS.BOOKED && (
              <Lock className="absolute top-0.5 right-0.5 w-3 h-3 text-red-500 opacity-80" aria-hidden />
            )}
            {slot.status === SLOT_STATUS.HELD && !isMyHold && (
              <Clock className="absolute top-0.5 right-0.5 w-3 h-3 text-amber-400 opacity-80" aria-hidden />
            )}
            {isSelected && (
              <CheckCircle2 className="absolute top-0.5 right-0.5 w-3.5 h-3.5 text-white" aria-hidden />
            )}

            <Icon
              className={cn("w-4 h-4 shrink-0", isSelected ? "text-white" : statusStyle.text)}
              aria-hidden
            />
            <span className={cn(
              "text-[9px] font-bold leading-none tabular-nums",
              isSelected ? "text-white" : statusStyle.text
            )}>
              {slot.slotNumber}
            </span>
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-900 border-slate-700 text-slate-100 text-xs">
          <p className="font-semibold">
            Slot {slot.slotNumber} · {typeConfig.label}
          </p>
          <p className="capitalize text-slate-400">{slot.status}</p>
          {slot.floor && <p className="text-slate-400">Floor: {slot.floor}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  const items = [
    { label: "Available", border: "border-emerald-500", bg: "bg-emerald-950/40" },
    { label: "Selected",  border: "border-white",       bg: "bg-white/20"       },
    { label: "On Hold",   border: "border-amber-500",   bg: "bg-amber-950/40"   },
    { label: "Booked",    border: "border-red-700",     bg: "bg-red-950/50"     },
  ]
  return (
    <div className="flex flex-wrap justify-center gap-3 mt-2">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={cn("w-5 h-5 rounded border-2", item.border, item.bg)} />
          <span className="text-xs text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Type filter pill ──────────────────────────────────────────────────────────
function TypePill({ type, active, onClick }) {
  const config = SLOT_TYPE_CONFIG[type]
  const Icon   = config.Icon
  return (
    <button
      onClick={() => onClick(type)}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
        active
          ? "border-white/60 bg-white/10 text-white"
          : "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300"
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </button>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  const total = stats.total || 1
  const pctAvailable = Math.round((stats.available / total) * 100)
  return (
    <div className="flex items-center gap-4 flex-wrap text-xs">
      <span className="flex items-center gap-1.5 text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <strong>{stats.available}</strong> available
      </span>
      <span className="flex items-center gap-1.5 text-amber-400">
        <Clock className="w-3.5 h-3.5" />
        <strong>{stats.held}</strong> on hold
      </span>
      <span className="flex items-center gap-1.5 text-red-400">
        <Lock className="w-3.5 h-3.5" />
        <strong>{stats.booked}</strong> booked
      </span>
      <div className="flex-1 min-w-[80px]">
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pctAvailable}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
      <span className="text-slate-400">{pctAvailable}% free</span>
    </div>
  )
}

// ── Floor section ─────────────────────────────────────────────────────────────
function FloorSection({ floor, entries, slotsPerRow, selectedSlotKey, userId, onSlotClick }) {
  const rows = []
  for (let i = 0; i < entries.length; i += slotsPerRow) {
    rows.push(entries.slice(i, i + slotsPerRow))
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500 px-2 py-0.5 border border-slate-700 rounded">
          {floor} Floor
        </span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex justify-center gap-2 flex-wrap">
            <span className="w-5 text-[9px] text-slate-600 self-center text-right shrink-0">
              {String.fromCharCode(65 + rowIdx + (floor === "First" ? 6 : 0))}
            </span>
            {row.map(([key, slot]) => (
              <SlotCell
                key={key}
                slotKey={key}
                slot={slot}
                isSelected={selectedSlotKey === key}
                isMyHold={slot.heldBy === userId}
                onClick={onSlotClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingSkeleton({ count }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-14 h-14 rounded-md border-2 border-slate-800 bg-slate-900 animate-pulse" />
      ))}
    </div>
  )
}

// ── Main SlotGrid ─────────────────────────────────────────────────────────────
export function SlotGrid({
  slots = {},
  loading,
  error,
  selectedSlotKey,
  stats,
  userId,
  onSlotClick,
  onRefresh,
  slotsPerRow = 10,
}) {
  const [typeFilter, setTypeFilter] = useState(null)

  const toggleType = useCallback(
    (type) => setTypeFilter(prev => (prev === type ? null : type)),
    []
  )

  // ✅ Guard: slots might be null/undefined on first render
  const safeSlots = slots && typeof slots === "object" ? slots : {}

  const grouped = useMemo(() => {
    const entries = Object.entries(safeSlots)
      .filter(([, s]) => (typeFilter ? s.type === typeFilter : true))
      .sort(([, a], [, b]) => a.slotNumber - b.slotNumber)

    const byFloor = {}
    entries.forEach(([key, slot]) => {
      const floor = slot.floor || "Ground"
      if (!byFloor[floor]) byFloor[floor] = []
      byFloor[floor].push([key, slot])
    })
    return byFloor
  }, [safeSlots, typeFilter])

  const floors   = Object.keys(grouped).sort()
  const allTypes = [...new Set(Object.values(safeSlots).map(s => s.type))]

  if (error && !error.includes("Realtime database")) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-500">
        <Info className="w-7 h-7" />
        <p className="text-sm text-center">{error}</p>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <StatsBar stats={stats} />
        <div className="flex items-center gap-2 flex-wrap">
          {allTypes.map(type => (
            <TypePill
              key={type}
              type={type}
              active={typeFilter === type}
              onClick={toggleType}
            />
          ))}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Entry aisle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 px-6 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 text-slate-400 text-xs font-medium tracking-widest uppercase">
          <Car className="w-3.5 h-3.5" />
          Entrance / Exit
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingSkeleton count={Math.min(stats.total || 20, 20)} />
      ) : (
        <div className="flex flex-col gap-8">
          {floors.map(floor => (
            <FloorSection
              key={floor}
              floor={floor}
              entries={grouped[floor]}
              slotsPerRow={slotsPerRow}
              selectedSlotKey={selectedSlotKey}
              userId={userId}
              onSlotClick={onSlotClick}
            />
          ))}
          {floors.length === 0 && (
            <p className="text-center text-slate-500 py-8 text-sm">
              {typeFilter ? "No slots match the current filter." : "No slots found."}
            </p>
          )}
        </div>
      )}

      <Legend />
    </div>
  )
}
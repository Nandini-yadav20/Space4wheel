"use client"

import { useSlots } from "@/hooks/useSlots"
import { bookSlot, releaseSlot } from "@/lib/firebase/slot-actions"

export default function SlotGrid() {
  const slots = useSlots()

  const handleClick = (id, status) => {
    if (status === "available") {
      bookSlot(id)
    } else {
      releaseSlot(id)
    }
  }

  return (
    <div className="grid grid-cols-4 gap-4 p-6">
      {Object.entries(slots).map(([id, slot]) => (
        <div
          key={id}
          onClick={() => handleClick(id, slot.status)}
          className={`p-6 text-center rounded-xl cursor-pointer transition-all
            ${slot.status === "available"
              ? "bg-green-500 hover:bg-green-600"
              : "bg-red-500 hover:bg-red-600"}
          `}
        >
          <h2 className="text-white font-bold">{id}</h2>
          <p className="text-white text-sm">{slot.status}</p>
        </div>
      ))}
    </div>
  )
}
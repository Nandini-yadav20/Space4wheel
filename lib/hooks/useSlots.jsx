"use client"

import { useEffect, useState } from "react"
import { ref, onValue } from "firebase/database"
import { useDatabase } from "@/lib/firebase/firebase-provider"

export const useSlots = (plotId = "plot1") => {
  const db = useDatabase()
  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) return

    const slotsRef = ref(db, `plots/${plotId}/slots`)

    const unsubscribe = onValue(slotsRef, (snapshot) => {
      const data = snapshot.val()
      setSlots(data || {})
      setLoading(false)
    })

    return () => unsubscribe()
  }, [db, plotId])

  return { slots, loading }
}
"use client"

import { useState, useEffect } from "react"

export function Typewriter({ text, speed = 50, delay = 0 }) {
  const [displayText, setDisplayText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [startTyping, setStartTyping] = useState(false)

  useEffect(() => {
    // Initial delay before starting to type
    const timer = setTimeout(() => {
      setStartTyping(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!startTyping) return

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prevText) => prevText + text[currentIndex])
        setCurrentIndex((prevIndex) => prevIndex + 1)
      }, speed)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, speed, text, startTyping])

  return (
    <span>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  )
}

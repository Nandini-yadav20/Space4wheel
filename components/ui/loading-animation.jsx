"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Car } from "lucide-react"

export function LoadingAnimation({ text = "Loading..." }) {
  const [dots, setDots] = useState(".")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."))
    }, 400)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative h-full w-full min-h-[200px] flex flex-col items-center justify-center overflow-hidden">
      {/* Blurred background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-blue-100 to-blue-50 dark:from-blue-950 dark:via-blue-900 dark:to-blue-950 opacity-70 blur-md"></div>

      {/* Road */}
      <div className="absolute bottom-0 w-full h-16 bg-gray-800 flex items-center justify-center">
        <div className="w-full h-1 bg-white flex">
          <motion.div
            className="h-full w-8 bg-white"
            initial={{ x: -100 }}
            animate={{ x: "calc(100vw + 100px)" }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2,
              ease: "linear",
            }}
          />
          <motion.div
            className="h-full w-8 bg-white ml-16"
            initial={{ x: -200 }}
            animate={{ x: "calc(100vw + 100px)" }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2,
              ease: "linear",
              delay: 0.5,
            }}
          />
          <motion.div
            className="h-full w-8 bg-white ml-16"
            initial={{ x: -300 }}
            animate={{ x: "calc(100vw + 100px)" }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 2,
              ease: "linear",
              delay: 1,
            }}
          />
        </div>
      </div>

      {/* Moving car */}
      <motion.div
        className="absolute bottom-16 z-10"
        initial={{ x: -100 }}
        animate={{ x: "calc(100vw + 100px)" }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 3,
          ease: "linear",
        }}
      >
        <div className="relative">
          <Car className="h-12 w-12 text-primary" />
          <motion.div
            className="absolute -bottom-1 left-1 w-10 h-3 bg-black/20 rounded-full"
            initial={{ scaleX: 0.8, scaleY: 0.3 }}
            animate={{ scaleX: 1, scaleY: 0.5 }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
              duration: 0.3,
            }}
          />
        </div>
      </motion.div>

      {/* Loading text */}
      <div className="mt-32 text-center z-10">
        <h3 className="text-xl font-semibold text-primary">
          {text}
          <span className="inline-block w-8">{dots}</span>
        </h3>
        <p className="text-sm text-muted-foreground mt-2">Finding the perfect parking spot for you</p>
      </div>
    </div>
  )
}

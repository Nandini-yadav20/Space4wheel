"use client"

import { motion } from "framer-motion"

export const FadeIn = ({ children, delay = 0, duration = 0.5, ...props }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration, delay }} {...props}>
      {children}
    </motion.div>
  )
}

export const SlideUp = ({ children, delay = 0, duration = 0.5, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const SlideIn = ({ children, direction = "left", delay = 0, duration = 0.5, ...props }) => {
  const x = direction === "left" ? -20 : direction === "right" ? 20 : 0
  const y = direction === "up" ? -20 : direction === "down" ? 20 : 0

  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const Scale = ({ children, delay = 0, duration = 0.5, ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration, delay }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const Stagger = ({ children, staggerChildren = 0.1, delayChildren = 0, ...props }) => {
  return (
    <motion.div
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      initial="hidden"
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const StaggerItem = ({ children, ...props }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5 }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export const AnimatedButton = ({ children, whileHover = { scale: 1.05 }, whileTap = { scale: 0.95 }, ...props }) => {
  return (
    <motion.button whileHover={whileHover} whileTap={whileTap} transition={{ duration: 0.2 }} {...props}>
      {children}
    </motion.button>
  )
}

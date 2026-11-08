"use client"

import React from "react"
import { motion } from "framer-motion"

interface AnimatedShinyTextProps {
  children: string
  className?: string
}

export function AnimatedShinyText({ children, className = "" }: AnimatedShinyTextProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      <style jsx global>{`
        @keyframes shine {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }

        .shiny-text {
          background: linear-gradient(
            90deg,
            #64748b 0%,
            #ffffff 50%,
            #64748b 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 8s linear infinite;
          padding: 0.1em 0;
          line-height: 1.2;
          display: inline-block;
          white-space: nowrap;
        }
      `}</style>
      <motion.span
        className="shiny-text"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.75 }}
      >
        {children}
      </motion.span>
    </div>
  )
} 
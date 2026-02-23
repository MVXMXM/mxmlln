"use client"

import React from "react"

interface AnimatedShinyTextProps {
  children: string
  className?: string
}

export function AnimatedShinyText({ children, className = "" }: AnimatedShinyTextProps) {
  return (
    <span className={className}>{children}</span>
  )
} 
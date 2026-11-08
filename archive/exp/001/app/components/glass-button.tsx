"use client"

import { Inter } from "next/font/google"
import { useCallback, useEffect, useRef, useState } from "react"

const inter = Inter({
  subsets: ["latin"],
  weight: ["500"],
})

interface GlassButtonProps {
  text?: string
  className?: string
  standalone?: boolean
}

export default function GlassButton({ 
  text = "Show Me The Light",
  className = "",
  standalone = false 
}: GlassButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [distance, setDistance] = useState(0)
  const [shadowAngle, setShadowAngle] = useState({ x: -1, y: 1 })

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!buttonRef.current) return

    const button = buttonRef.current
    const buttonRect = button.getBoundingClientRect()

    // Calculate button center
    const buttonCenterX = buttonRect.left + buttonRect.width / 2
    const buttonCenterY = buttonRect.top + buttonRect.height / 2

    // Calculate relative mouse position to button center
    const x = event.clientX - buttonRect.left
    const y = event.clientY - buttonRect.top

    // Calculate distance from mouse to button center
    const deltaX = event.clientX - buttonCenterX
    const deltaY = event.clientY - buttonCenterY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Normalize distance to a 0-1 range, where 1 is when mouse is 200px away
    const normalizedDistance = Math.min(distance / 200, 1)

    // Calculate shadow angle based on mouse position relative to button center
    const shadowX = -deltaX / distance || -1
    const shadowY = -deltaY / distance || 1

    setMousePosition({ x, y })
    setDistance(1 - normalizedDistance)
    setShadowAngle({ x: shadowX, y: shadowY })
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  const getDynamicShadow = () => {
    const insetX = shadowAngle.x * 1
    const insetY = shadowAngle.y * 1
    const shadowX = shadowAngle.x * 3
    const shadowY = shadowAngle.y * 3

    // Scale shadow sizes based on distance
    const blackShadowScale = 1 - distance
    const whiteShadowScale = distance
    const blurScale = 1 + (distance * 1.2)

    return `${shadowX * 120 * blackShadowScale}px ${shadowY * 120 * blackShadowScale}px ${120 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.12),
            ${shadowX * 85 * blackShadowScale}px ${shadowY * 85 * blackShadowScale}px ${90 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.1),
            ${shadowX * 55 * blackShadowScale}px ${shadowY * 55 * blackShadowScale}px ${65 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.08),
            ${shadowX * 35 * blackShadowScale}px ${shadowY * 35 * blackShadowScale}px ${45 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.06),
            ${shadowX * 20 * blackShadowScale}px ${shadowY * 20 * blackShadowScale}px ${30 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.05),
            ${shadowX * 12 * blackShadowScale}px ${shadowY * 12 * blackShadowScale}px ${20 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.04),
            ${insetX * whiteShadowScale}px ${insetY * whiteShadowScale}px ${2 + (whiteShadowScale * 4)}px 0px rgba(255, 255, 255, 0.3) inset`
  }

  const Button = (
    <button
      ref={buttonRef}
      className={`${inter.className} ${className} group relative flex h-10 items-center justify-center overflow-hidden rounded-full px-4 backdrop-blur-[1px] 
        transition-all active:scale-95`}
      style={{
        background: "rgba(105, 105, 105, 0.04)",
        boxShadow: getDynamicShadow(),
        transition: "box-shadow 0.2s ease-out",
      }}
    >
      {/* Gradient border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          padding: "1px",
          background: `linear-gradient(
            ${Math.atan2(shadowAngle.y, shadowAngle.x) * (180 / Math.PI) + 90}deg,
            rgba(255, 255, 255, 0.94),
            #797979 26%,
            #a4a4a4 63%,
            rgba(255, 255, 255, ${0.5 + (distance * 0.5)})
          )`,
          mask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          maskComposite: "exclude",
          WebkitMaskComposite: "xor",
        }}
      />

      {/* Base glass background */}
      <div
        className="absolute inset-0 transition-opacity duration-100"
        style={{
          background: `radial-gradient(
            circle at ${mousePosition.x}px ${mousePosition.y}px, 
            rgba(255,255,255,${0.15 * distance}) 0%, 
            rgba(255,255,255,${0.1 * distance}) 15%, 
            rgba(255,255,255,${0.05 * distance}) 35%, 
            rgba(255,255,255,${0.025 * distance}) 50%,
            transparent 70%
          )`,
          filter: "blur(12px)",
          transform: "translateZ(0)",
        }}
      />

      {/* Sharp specular highlight */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(
            circle at ${mousePosition.x}px ${mousePosition.y}px, 
            rgba(255,255,255,${0.7 * distance}) 0%, 
            rgba(255,255,255,${0.5 * distance}) 5%,
            rgba(255,255,255,${0.3 * distance}) 10%,
            rgba(255,255,255,${0.1 * distance}) 20%,
            rgba(255,255,255,0) 35%
          )`,
          opacity: 0.4,
          transform: "translateZ(0)",
        }}
      />

      {/* Smooth reflection effect */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: `linear-gradient(105deg, 
            transparent 0%, 
            rgba(255,255,255,${3 * distance}) 0%, 
            rgba(255,255,255,${3 * distance}) 50%, 
            rgba(255,255,255,${3 * distance}) 100%, 
            transparent 100%
          )`,
          transform: `translate3d(${mousePosition.x / 2}px, ${mousePosition.y / 2}px, 0)`,
          opacity: distance,
          filter: "blur(60px)",
        }}
      />

      {/* Content */}
      <span className="relative z-10 text-sm font-medium text-black [text-shadow:0_1px_2px_rgba(0,0,0,0.1)]">
        {text}
      </span>
    </button>
  )

  if (standalone) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#CBD5E1" }}
      >
        {Button}
      </div>
    )
  }

  return Button
}


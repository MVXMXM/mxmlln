"use client"

import { Inter } from "next/font/google"
import { useCallback, useEffect, useRef, useState } from "react"
import GlassButton from "./glass-button"

const inter = Inter({
  subsets: ["latin"],
  weight: ["500"],
})

interface GlassCardProps {
  title: string
  subtitle: string
  imageUrl?: string
  buttonText?: string
}

export default function GlassCard({ 
  title = "Card Title", 
  subtitle = "Card Subtitle", 
  imageUrl = "", 
  buttonText = "Show Me The Light" 
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [elementPositions, setElementPositions] = useState({
    image: { x: 0, y: 0 },
    title: { x: 0, y: 0 },
    subtitle: { x: 0, y: 0 }
  })
  const [distance, setDistance] = useState(0)
  const [shadowAngle, setShadowAngle] = useState({ x: -1, y: 1 })

  const getRelativeMousePosition = (event: MouseEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }
  }

  const getShimmerStyles = (element: HTMLElement | null, event: MouseEvent) => {
    if (!element) return { x: 0, y: 0 }
    
    const rect = element.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    
    return { x, y }
  }

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!cardRef.current) return

    const card = cardRef.current
    const cardRect = card.getBoundingClientRect()

    // Calculate card center
    const cardCenterX = cardRect.left + cardRect.width / 2
    const cardCenterY = cardRect.top + cardRect.height / 2

    // Calculate distance from mouse to card center
    const deltaX = event.clientX - cardCenterX
    const deltaY = event.clientY - cardCenterY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Normalize distance to a 0-1 range, increased range from 400px to 800px
    const normalizedDistance = Math.min(distance / 800, 1)

    // Use a more gradual falloff for the distance effect
    const effectiveDistance = Math.pow(1 - normalizedDistance, 0.5)

    // Calculate shadow angle based on mouse position relative to card center
    const shadowX = -deltaX / distance || -1
    const shadowY = -deltaY / distance || 1

    // Calculate relative positions as percentages for each element
    const positions = {
      image: getShimmerStyles(imageRef.current, event),
      title: getShimmerStyles(titleRef.current, event),
      subtitle: getShimmerStyles(subtitleRef.current, event)
    }

    setElementPositions(positions)
    setMousePosition(getRelativeMousePosition(event, card))
    setDistance(effectiveDistance)
    setShadowAngle({ x: shadowX, y: shadowY })
  }, [])

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [handleMouseMove])

  const getDynamicShadow = () => {
    const shadowX = shadowAngle.x * 1.5
    const shadowY = shadowAngle.y * 1.5

    // Scale shadow sizes based on distance
    const blackShadowScale = 1 - distance
    const whiteShadowScale = distance
    const blurScale = 1 + (distance * 0.6)

    return `${shadowX * 45 * blackShadowScale}px ${shadowY * 45 * blackShadowScale}px ${70 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.06),
            ${shadowX * 25 * blackShadowScale}px ${shadowY * 25 * blackShadowScale}px ${45 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.04),
            ${shadowX * 15 * blackShadowScale}px ${shadowY * 15 * blackShadowScale}px ${25 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.03),
            ${shadowX * 10 * blackShadowScale}px ${shadowY * 10 * blackShadowScale}px ${15 * blurScale * blackShadowScale}px 0 rgba(0, 0, 0, 0.02)`
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={{ backgroundColor: "#CBD5E1" }}>
      <div
        ref={cardRef}
        className={`${inter.className} relative w-[400px] rounded-[24px] p-6 overflow-hidden`}
        style={{
          background: `radial-gradient(
            circle at ${mousePosition.x}px ${mousePosition.y}px,
            rgba(255, 255, 255, 0.75) 0%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0.25) 100%
          )`,
          backdropFilter: "blur(8px)",
          boxShadow: getDynamicShadow(),
          transition: "box-shadow 0.2s ease-out, background 0.2s ease-out",
        }}
      >
        {/* Gradient border */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[24px]"
          style={{
            padding: "1px",
            background: `linear-gradient(
              ${Math.atan2(shadowAngle.y, shadowAngle.x) * (180 / Math.PI) + 90}deg,
              rgba(0, 0, 0, 0.1),
              rgba(0, 0, 0, 0.2) 26%,
              rgba(0, 0, 0, 0.15) 63%,
              rgba(0, 0, 0, ${0.1 + (distance * 0.2)})
            )`,
            mask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
            maskComposite: "exclude",
            WebkitMaskComposite: "xor",
          }}
        />

        {/* Image placeholder */}
        <div className="relative mb-4" ref={imageRef}>
          <div 
            className="h-48 w-full rounded-[8px] bg-gray-100"
            style={{
              background: imageUrl ? `url(${imageUrl}) center/cover` : "rgba(0, 0, 0, 0.05)",
              boxShadow: getDynamicShadow(),
            }}
          />
        </div>

        {/* Content */}
        <div className="mb-8">
          <div className="mb-2" ref={titleRef}>
            <h2 
              className="text-2xl font-semibold text-black"
            >
              {title}
            </h2>
          </div>
          
          <div ref={subtitleRef}>
            <p 
              className="text-base text-black/80"
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Button container */}
        <div className="flex justify-end">
          <GlassButton />
        </div>
      </div>
    </div>
  )
}
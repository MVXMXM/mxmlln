"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedShinyText } from "./AnimatedShinyText"

interface TextAnimateProps {
  children: string
  animation?: "blurInUp" | "blurInDown" | "blurInLeft" | "blurInRight"
  by?: "character" | "word"
  once?: boolean
  className?: string
}

export function TextAnimate({
  children,
  animation = "blurInUp",
  by = "character",
  once = false,
  className = "",
}: TextAnimateProps) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) {
            observer.disconnect()
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [once])

  const getAnimationVariants = () => {
    const baseVariants = {
      hidden: {
        opacity: 0,
        filter: "blur(10px)",
      },
      visible: {
        opacity: 1,
        filter: "blur(0px)",
      },
    }

    const directionVariants = {
      blurInUp: {
        hidden: { ...baseVariants.hidden, y: 30 },
        visible: { ...baseVariants.visible, y: 0 },
      },
      blurInDown: {
        hidden: { ...baseVariants.hidden, y: -30 },
        visible: { ...baseVariants.visible, y: 0 },
      },
      blurInLeft: {
        hidden: { ...baseVariants.hidden, x: 30 },
        visible: { ...baseVariants.visible, x: 0 },
      },
      blurInRight: {
        hidden: { ...baseVariants.hidden, x: -30 },
        visible: { ...baseVariants.visible, x: 0 },
      },
    }

    return directionVariants[animation]
  }

  const splitText = by === "character" ? children.split("") : children.split(" ")

  return (
    <div ref={containerRef} className={`inline-block ${className}`}>
      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .char-wrapper {
          position: relative;
          display: inline-block;
        }

        .char-wrapper::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(90deg, #ff0080, #7928ca, #ff0080);
          background-size: 200% 100%;
          z-index: -1;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .char-wrapper:hover::before {
          opacity: 1;
          animation: gradient 2s linear infinite;
        }

        .char-wrapper:hover .char {
          color: white;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
      `}</style>
      <AnimatePresence>
        {isVisible && (
          <>
            {splitText.map((char, index) => (
              <motion.div
                key={index}
                className="char-wrapper"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={getAnimationVariants()}
                transition={{
                  duration: 0.7,
                  delay: index * 0.05,
                  ease: [0.4, 0, 0.2, 1],
                }}
              >
                <AnimatedShinyText className="char inline-block">
                  {char}
                  {by === "character" && char === " " && <span>&nbsp;</span>}
                </AnimatedShinyText>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  )
} 
'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContextMenuProps {
  selection: {
    text: string
    range: Range
  }
  onZoomIn: () => void
  onClose: () => void
}

export const ContextMenu = ({ selection, onZoomIn, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const rect = selection.range.getBoundingClientRect()
  const scrollY = window.scrollY
  const scrollX = window.scrollX

  // Calculate position to ensure menu stays within viewport
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const menuWidth = 120 // min-w-[120px]
  const menuHeight = 40 // Approximate height

  let left = rect.left + scrollX
  let top = rect.bottom + scrollY

  // Adjust horizontal position if menu would overflow viewport
  if (left + menuWidth > viewportWidth) {
    left = viewportWidth - menuWidth - 16 // 16px margin
  }

  // Adjust vertical position if menu would overflow viewport
  if (top + menuHeight > viewportHeight) {
    top = rect.top + scrollY - menuHeight
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{
          duration: 0.15,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          position: 'absolute',
          top,
          left,
        }}
        className="bg-white shadow-lg rounded-lg border border-slate-200 py-1 px-1 min-w-[120px] z-50 backdrop-blur-sm bg-white/95"
      >
        <motion.button
          onClick={onZoomIn}
          className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded flex items-center gap-2 transition-all"
          whileHover={{ backgroundColor: 'rgb(241 245 249)' }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.span
            initial={{ rotate: -90 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.2 }}
          >
            🔍
          </motion.span>
          Zoom In
        </motion.button>
      </motion.div>
    </AnimatePresence>
  )
}

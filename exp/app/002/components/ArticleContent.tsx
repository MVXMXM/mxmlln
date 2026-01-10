'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Microscope, Telescope, MoveHorizontal } from 'lucide-react'

interface ArticleContentProps {
  initialContent: string
  onLoadingStateChange?: (isLoading: boolean, activeButton: 'expand' | 'contract' | null, operationSummary?: { beforeCount: number, afterCount: number }) => void
  onWordCountChange?: (wordCount: number) => void
  onHasTextChange?: (hasText: boolean) => void
  onContentManuallyEdited?: () => void
  onEngagementChange?: (isEngaged: boolean) => void
}

export const ArticleContent = ({ initialContent, onLoadingStateChange, onWordCountChange, onHasTextChange, onContentManuallyEdited, onEngagementChange }: ArticleContentProps) => {
  const [content, setContent] = useState(initialContent)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [activeButton, setActiveButton] = useState<'expand' | 'contract' | null>(null)
  const [oldContent, setOldContent] = useState('') // Store previous content for morphing effect
  const [hasText, setHasText] = useState(false) // Track if user has entered text to trigger full-height mode
  const [shouldExpand, setShouldExpand] = useState(false) // Controls when to actually show the expanded height (debounced)
  const [hasPerformedFirstZoom, setHasPerformedFirstZoom] = useState(false) // Track if first zoom happened to disable autofocus
  const [showDragTooltip, setShowDragTooltip] = useState<'contract' | 'expand' | null>(null) // Track which tooltip to show during drag
  const [lastGeneratedContent, setLastGeneratedContent] = useState('') // Track the last generated content to detect user edits
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  // Calculate word count from content
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  // Smooth scroll to top anchor when zoom operation starts
  const scrollToTop = () => {
    // Small delay to ensure DOM is ready, then scroll
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      })
    }, 50)
  }


  // Notify parent component of loading state changes
  useEffect(() => {
    onLoadingStateChange?.(isLoading, activeButton)
  }, [isLoading, activeButton, onLoadingStateChange])

  // Notify parent component of word count changes
  useEffect(() => {
    const wordCount = getWordCount(content)
    onWordCountChange?.(wordCount)
  }, [content, onWordCountChange])

  // Track when user has entered text to trigger full-height mode
  useEffect(() => {
    const hasContent = content.trim().length > 0
    if (hasContent !== hasText) {
      setHasText(hasContent)
      onHasTextChange?.(hasContent)
    }
  }, [content, hasText, onHasTextChange])

  // Debounce the expansion to happen 500ms after user stops typing
  useEffect(() => {
    if (!hasText) {
      setShouldExpand(false)
      return
    }

    const timeoutId = setTimeout(() => {
      setShouldExpand(true)
    }, 500)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [content, hasText])

  // Notify parent when engagement state changes
  useEffect(() => {
    onEngagementChange?.(shouldExpand)
  }, [shouldExpand, onEngagementChange])

  // Detect if user manually edited the generated content
  useEffect(() => {
    // Only check if we have generated content and we're not currently loading
    if (!isLoading && lastGeneratedContent && content !== lastGeneratedContent && content.trim().length > 0) {
      // User has manually edited the content
      onContentManuallyEdited?.()
      // Clear the last generated content so we don't trigger this again
      setLastGeneratedContent('')
    }
  }, [content, lastGeneratedContent, isLoading, onContentManuallyEdited])

  const handleRewrite = async (operation: 'expand' | 'contract') => {
    if (!content.trim()) {
      setError(`Please enter some text to ${operation}.`)
      setTimeout(() => setError(null), 3000)
      return
    }
    
    const beforeCount = content.trim().split(/\s+/).filter(word => word.length > 0).length
    setIsLoading(true)
    setError(null)
    setActiveButton(operation)
    
    // Scroll to top for better UX
    scrollToTop()
    
    // Mark that first zoom has been performed (to disable autofocus after this)
    setHasPerformedFirstZoom(true)
    
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: `"${content}"`,
          operation
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let result = ''
      
      // Save old content for morphing effect, then clear
      setOldContent(content)
      setContent('')
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
      const chunk = decoder.decode(value, { stream: true })
      result += chunk
      setContent(result)
    }
    
    
    // After streaming is complete, notify parent with operation summary
    const afterCount = result.trim().split(/\s+/).filter(word => word.length > 0).length
    onLoadingStateChange?.(false, operation, { beforeCount, afterCount })
    
    // Store the generated content to detect future manual edits
    setLastGeneratedContent(result)
    
    // Clear old content after transition completes
    setTimeout(() => {
      setOldContent('')
    }, 500)
    
  } catch (error) {
    console.error(`Error ${operation}ing text:`, error)
    setError(`Failed to ${operation} text. Please try again.`)
    setTimeout(() => setError(null), 3000)
  } finally {
    setIsLoading(false)
    setActiveButton(null)
    setSliderPosition(0) // Snap back to center when done loading
  }
  }

  const handleExpand = () => {
    setSliderPosition(84)
    handleRewrite('expand')
  }
  const handleContract = () => {
    setSliderPosition(-84)
    handleRewrite('contract')
  }

  // Auto-resize textarea based on content
  const autoResize = useCallback(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the natural height
      textareaRef.current.style.height = 'auto'
      // Set height to scrollHeight to fit all content without scrollbar
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      // Ensure no overflow/scrollbar
      textareaRef.current.style.overflow = 'hidden'
    }
  }, [])

  // Update textarea height when content changes
  React.useEffect(() => {
    autoResize()
  }, [content, autoResize])

  // Update light position based on slider position
  React.useEffect(() => {
    const updateLightPosition = () => {
      const pointLight = document.getElementById('point-light')
      const sliderLight = document.getElementById('slider-light')
      
      if (pointLight && sliderLight) {
        // Calculate light position based on slider position
        const lightX = 128 + sliderPosition * 1.5 // Adjust multiplier for sensitivity
        
        pointLight.setAttribute('x', lightX.toString())
        sliderLight.setAttribute('lightingColor', '#00d4ff')
      }
    }
    
    updateLightPosition()
  }, [sliderPosition])

  const handleSliderDrag = useCallback((event: MouseEvent | TouchEvent) => {
    if (!isDragging || !sliderRef.current) return
    
    const slider = sliderRef.current
    const rect = slider.getBoundingClientRect()
    const sliderWidth = rect.width - 64 // Account for handle width (16 * 4 = 64px)
    
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
    const x = clientX - rect.left - 32 // Center the handle (16 * 2 = 32px)
    const position = Math.max(-sliderWidth / 2, Math.min(sliderWidth / 2, x - sliderWidth / 2))
    
    setSliderPosition(position)
    
    // Show appropriate tooltip based on drag direction
    const threshold = 20 // Minimum distance to show tooltip
    if (position < -threshold) {
      setShowDragTooltip('contract')
    } else if (position > threshold) {
      setShowDragTooltip('expand')
    } else {
      setShowDragTooltip(null)
    }
  }, [isDragging])

  const handleSliderStart = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (isLoading || activeButton) return
    setIsDragging(true)
    event.preventDefault()
  }, [isLoading, activeButton])

  const handleSliderEnd = useCallback(() => {
    if (!isDragging) return
    
    const threshold = 50 // Minimum distance to trigger action
    
    if (Math.abs(sliderPosition) > threshold) {
      if (sliderPosition < -threshold) {
        handleContract()
      } else if (sliderPosition > threshold) {
        handleExpand() 
      }
    } else {
      // If not enough distance, reset to center
      setSliderPosition(0)
    }
    
    setIsDragging(false)
    setShowDragTooltip(null) // Hide tooltip when drag ends
  }, [isDragging, sliderPosition])

  // Add event listeners for mouse/touch move and end
  React.useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent | TouchEvent) => handleSliderDrag(e)
    const handleEnd = () => handleSliderEnd()

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [isDragging, handleSliderDrag, handleSliderEnd])

  // Add keyboard event listeners for arrow keys
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if not loading and not dragging, and no button is active
      if (isLoading || isDragging || activeButton) return
      
      // Check if user is focused on textarea
      const isTextareaFocused = document.activeElement === textareaRef.current
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          handleContract()
          break
        case 'ArrowRight':
          event.preventDefault()
          handleExpand()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isLoading, isDragging, activeButton, handleContract, handleExpand])

  return (
    <div 
      className="relative"
      style={{
        height: shouldExpand ? 'calc(100dvh - 96px - 32px)' : '200px', // 96px for py-12, 32px for header approx
        transition: 'height 1000ms cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Old content overlay for morphing effect */}
      {oldContent && (
        <div
          className="absolute inset-0 pointer-events-none text-slate-900 text-[20px] leading-relaxed whitespace-pre-wrap pb-[132px]"
          style={{
            opacity: isLoading ? 0.4 : 0,
            filter: isLoading ? 'blur(3px)' : 'blur(0px)',
            letterSpacing: '-0.01em',
            zIndex: 1,
            transition: 'opacity 150ms ease-out, filter 250ms ease-out'
          }}
        >
          {oldContent}
        </div>
      )}
      
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className={`w-full min-h-[200px] resize-none text-[20px] leading-relaxed bg-transparent border-none outline-none pb-[132px] relative ${
          isLoading ? 'loading-text' : 'text-slate-900'
        }`}
        style={{ 
          caretColor: '#06b6d4', 
          height: shouldExpand ? '100%' : 'auto',
          overflow: 'hidden',
          letterSpacing: '-0.01em',
          filter: isLoading ? 'blur(3px)' : 'blur(0px)',
          zIndex: 2,
          transition: 'filter 1000ms ease-out'
        }}
        placeholder="Type or paste text to apply semantic zoom"
        autoFocus={!hasPerformedFirstZoom}
        disabled={isLoading}
      />

      {/* SVG Lighting Filter Definition */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="lighting" x="-50%" y="-50%" width="200%" height="200%">
            <feSpecularLighting
              id="slider-light"
              specularConstant="8"
              specularExponent="120"
              surfaceScale="2"
              lightingColor="#00d4ff"
            >
              <fePointLight
                id="point-light"
                x="128"
                y="48"
                z="100"
              />
            </feSpecularLighting>
            <feComposite
              in="SourceGraphic"
              in2="specOut"
              operator="arithmetic"
              k1="0"
              k2="1"
              k3="1"
              k4="0"
            />
          </filter>
          
        </defs>
      </svg>

      {/* Fixed slider control at bottom */}
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out" 
        style={{ 
          zIndex: 9999,
          bottom: shouldExpand ? '24px' : '-100px'
        }}
      >
        <div 
          ref={sliderRef}
          className={`control-container relative w-[264px] h-24 rounded-full flex items-center justify-between px-4 backdrop-blur-[30px] border border-slate-200 ${
            isLoading || activeButton ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
          style={{
            '--border': '1',
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(196, 196, 196, 0.5) 100%)',
            boxShadow: '0 0 40px 0 rgba(179, 179, 179, 0.15), 0 8px 32px 0 rgba(31, 38, 135, 0.2)'
          } as React.CSSProperties}
        >
          {/* Lighting border effect */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: '-1px',
              border: `calc(var(--border) * 1px) solid transparent`,
              background: 'transparent',
              mask: 'linear-gradient(transparent 0 100%) padding-box, linear-gradient(#fff 0 100%) border-box',
              maskComposite: 'intersect',
              filter: 'url(#lighting)'
            }}
          />
          
          {}
          <button 
            className="w-[64px] h-[64px] flex items-center justify-center rounded-full hover:cursor-pointer transition-all duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 relative group"
            onClick={() => !isLoading && !activeButton && handleContract()}
            disabled={isLoading || !!activeButton}
            type="button"
            style={{
              background: 'linear-gradient(180deg, rgba(180, 195, 216, 0.75) 0%, rgba(180, 195, 216, 0.5) 50%, rgba(223, 233, 242, 0.25) 100%)',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
              transition: 'box-shadow 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.4)'
            }}
          >
            <Microscope className="w-[24px] h-[24px] text-slate-800" strokeWidth={2} />
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-[10px] py-2 bg-gray-500 text-white text-xs rounded-[10px] translate-y-1 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 font-bold ${
              showDragTooltip === 'contract' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
            }`}>
              Distill
            </div>
          </button>
          
          {/* Center indicator */}
          <div className="w-[64px] h-[64px] flex items-center justify-center">
            <MoveHorizontal className="w-[24px] h-[24px] text-slate-800" strokeWidth={2} />
          </div>
          
          {}
          <button 
            className="w-[64px] h-[64px] flex items-center justify-center rounded-full hover:cursor-pointer transition-all duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50 relative group"
            onClick={() => !isLoading && !activeButton && handleExpand()}
            disabled={isLoading || !!activeButton}
            type="button"
            style={{
              background: 'linear-gradient(180deg, rgba(180, 195, 216, 0.75) 0%, rgba(180, 195, 216, 0.5) 50%, rgba(223, 233, 242, 0.25) 100%)',
              boxShadow: '0 0 15px rgba(255, 255, 255, 0.4)',
              transition: 'box-shadow 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.4)'
            }}
          >
            <Telescope className="w-[24px] h-[24px] text-slate-800" strokeWidth={2} />
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-[10px] py-2 bg-gray-500 text-white text-xs rounded-[10px] translate-y-1 transition-all duration-200 whitespace-nowrap pointer-events-none z-50 font-bold ${
              showDragTooltip === 'expand' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0'
            }`}>
              Extrapolate
            </div>
          </button>
          
        {/* Drag handle */}
        <div 
          className="drag-handle-wrap"
          style={{ 
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${sliderPosition}px), -50%)`,
            zIndex: 50,
          }}
        >
          <div className="drag-handle-shadow"></div>
          <div 
            className="drag-handle"
            style={{
              cursor: isLoading || activeButton ? 'not-allowed' : 'grab',
              background: 'radial-gradient(50% 50% at 50% 50%, rgba(34, 174, 255, 0.55) 50%, rgba(34, 174, 255, 0.85) 75%, rgba(34, 174, 255, 1) 85%, #22AEFF 100%)',
              backdropFilter: 'blur(0.65px)',
              backgroundBlendMode: 'normal',
              mixBlendMode: 'screen',
              filter: 'brightness(1.15) contrast(1.5)',
              boxShadow: '0 294px 82px 0 rgba(0, 191, 255, 0.00), 0 188px 75px 0 rgba(0, 191, 255, 0.05), 0 106px 64px 0 rgba(0, 191, 255, 0.08), 0 30px 30px 0 rgba(0, 191, 255, 0.15), 0 10px 30px 0 rgba(0, 191, 255, 0.33)'
            }}
            onMouseDown={handleSliderStart}
            onTouchStart={handleSliderStart}
          >
            <span></span>
          </div>
        </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow-lg border border-red-200 z-40"
        >
          {error}
        </motion.div>
      )}

    </div>
  )
}

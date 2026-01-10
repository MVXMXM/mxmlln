'use client'

import { useState, useEffect } from 'react'
import { ArticleContent } from './components/ArticleContent'
import { MorphingText } from '@/registry/magicui/morphing-text'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<'expand' | 'contract' | null>(null)
  const [hasText, setHasText] = useState(false)
  const [isEngaged, setIsEngaged] = useState(false) // Track if user has exited welcome state
  const [hasPerformedZoom, setHasPerformedZoom] = useState(false)
  const [lastOperation, setLastOperation] = useState<{
    type: 'expand' | 'contract'
    beforeCount: number
    afterCount: number
  } | null>(null)

  // Reset zoom state when user deletes all text
  useEffect(() => {
    if (!hasText) {
      setHasPerformedZoom(false)
      setLastOperation(null)
      setIsEngaged(false)
    }
  }, [hasText])

  const handleLoadingStateChange = (loading: boolean, button: 'expand' | 'contract' | null, operationSummary?: { beforeCount: number, afterCount: number }) => {
    setIsLoading(loading)
    setActiveButton(button)
    
    // If operation completed and we have summary data, store it
    if (!loading && button && operationSummary) {
      setHasPerformedZoom(true)
      setLastOperation({
        type: button,
        beforeCount: operationSummary.beforeCount,
        afterCount: operationSummary.afterCount
      })
    }
  }

  const handleContentManuallyEdited = () => {
    // Reset to the "select zoom direction" state when user edits generated content
    setLastOperation(null)
  }

  const getTitleContent = () => {
    if (isLoading && activeButton === 'contract') {
      return 'Zooming in...'
    }
    if (isLoading && activeButton === 'expand') {
      return 'Zooming out...'
    }
    if (lastOperation) {
      return (
        <>
          <span className="line-through font-normal">{lastOperation.beforeCount} words</span> {lastOperation.afterCount} words
        </>
      )
    }
    // Show instruction if user has text but either hasn't zoomed yet OR has edited after zooming
    if (isEngaged && (hasPerformedZoom === false || lastOperation === null)) {
      return 'Select a zoom direction below'
    }
    return 'Welcome to Zoomer'
  }

  return (
    <main className="min-h-screen  bg-slate-50 flex flex-col items-center justify-center">
      <div id="top" className="w-full max-w-[650px] mx-auto px-4 py-12">
        <h1 className="text-[20px] leading-relaxed font-bold text-left text-[#06b6d4]" style={{ letterSpacing: '-0.01em' }}>
          <MorphingText>
            {getTitleContent()}
          </MorphingText>
        </h1>
        <ArticleContent 
          initialContent="" 
          onLoadingStateChange={handleLoadingStateChange}
          onHasTextChange={setHasText}
          onContentManuallyEdited={handleContentManuallyEdited}
          onEngagementChange={setIsEngaged}
        />
      </div>
    </main>
  )
}

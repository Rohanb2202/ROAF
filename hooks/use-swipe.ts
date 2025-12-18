import { useRef, useEffect, useCallback } from "react"

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions {
  threshold?: number // minimum distance for swipe
  edgeOnly?: boolean // only trigger from edge of screen
  edgeWidth?: number // width of edge zone in pixels
  minVelocity?: number // minimum velocity (px/ms) to trigger swipe
}

export function useSwipe(
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) {
  const { threshold = 100, edgeOnly = false, edgeWidth = 30, minVelocity = 0.3 } = options

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)
  const touchStartTime = useRef(0)
  const isFromEdge = useRef(false)
  const hasMoved = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    isFromEdge.current = touchStartX.current < edgeWidth
    hasMoved.current = false
  }, [edgeWidth])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
    hasMoved.current = true
  }, [])

  const handleTouchEnd = useCallback(() => {
    // Don't process if no movement occurred
    if (!hasMoved.current) return

    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Calculate velocity
    const duration = Date.now() - touchStartTime.current
    const velocity = absDeltaX / duration

    // Require minimum velocity to prevent slow drags from triggering
    if (velocity < minVelocity) return

    // Only process if horizontal swipe is dominant (at least 2x more horizontal than vertical)
    if (absDeltaX > absDeltaY * 2 && absDeltaX > threshold) {
      // Check edge constraint if enabled
      if (edgeOnly && !isFromEdge.current) return

      if (deltaX > 0) {
        handlers.onSwipeRight?.()
      } else {
        handlers.onSwipeLeft?.()
      }
    } else if (absDeltaY > absDeltaX * 2 && absDeltaY > threshold) {
      if (deltaY > 0) {
        handlers.onSwipeDown?.()
      } else {
        handlers.onSwipeUp?.()
      }
    }
  }, [handlers, threshold, edgeOnly, minVelocity])

  useEffect(() => {
    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchmove", handleTouchMove, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchmove", handleTouchMove)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])
}

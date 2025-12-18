import { useCallback, useRef } from "react"

interface UseLongPressOptions {
  onLongPress: () => void
  onClick?: () => void
  delay?: number
}

export function useLongPress({ onLongPress, onClick, delay = 500 }: UseLongPressOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef(false)

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    // Prevent context menu on long press
    e.preventDefault()
    isLongPressRef.current = false
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      onLongPress()
    }, delay)
  }, [onLongPress, delay])

  const clear = useCallback((e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (shouldTriggerClick && !isLongPressRef.current && onClick) {
      onClick()
    }
  }, [onClick])

  const handlers = {
    onTouchStart: start,
    onTouchEnd: (e: React.TouchEvent) => clear(e, true),
    onTouchMove: (e: React.TouchEvent) => clear(e, false),
    onMouseDown: start,
    onMouseUp: (e: React.MouseEvent) => clear(e, true),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }

  return handlers
}

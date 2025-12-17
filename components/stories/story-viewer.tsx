"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, ChevronLeft, ChevronRight, Eye, Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Story, UserProfile } from "@/lib/firebase/firestore"

interface StoryViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stories: Story[]
  users: Map<string, UserProfile>
  currentUserId: string
  initialStoryIndex?: number
  onStoryViewed: (storyId: string) => void
}

export function StoryViewer({
  open,
  onOpenChange,
  stories,
  users,
  currentUserId,
  initialStoryIndex = 0,
  onStoryViewed,
}: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const currentStory = stories[currentIndex]
  const storyUser = currentStory ? users.get(currentStory.userId) : null

  const STORY_DURATION = 5000 // 5 seconds per story

  // Reset when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialStoryIndex)
      setProgress(0)
      setIsPaused(false)
    }
  }, [open, initialStoryIndex])

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !currentStory.viewers.includes(currentUserId)) {
      onStoryViewed(currentStory.id!)
    }
  }, [currentStory, currentUserId, onStoryViewed])

  // Progress timer
  useEffect(() => {
    if (!open || isPaused || !currentStory) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          // Move to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1)
            return 0
          } else {
            // End of stories - schedule close outside of setState
            return 101 // Signal to close
          }
        }
        return prev + (100 / (STORY_DURATION / 100))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [open, isPaused, currentStory, currentIndex, stories.length])

  // Handle closing when progress exceeds 100 (end of all stories)
  useEffect(() => {
    if (progress > 100) {
      onOpenChange(false)
    }
  }, [progress, onOpenChange])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      setProgress(0)
    }
  }, [currentIndex])

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1)
      setProgress(0)
    } else {
      onOpenChange(false)
    }
  }, [currentIndex, stories.length, onOpenChange])

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width

    if (x < width / 3) {
      goToPrevious()
    } else if (x > (width * 2) / 3) {
      goToNext()
    } else {
      setIsPaused(p => !p)
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m ago`
    }
    return `${hours}h ago`
  }

  if (!currentStory) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-none !w-screen !h-[100dvh] !p-0 !m-0 !rounded-none !border-0 !top-0 !left-0 !translate-x-0 !translate-y-0 sm:!max-w-md sm:!w-[400px] sm:!h-[90vh] sm:!rounded-2xl sm:!top-[5vh] sm:!left-1/2 sm:!-translate-x-1/2 bg-black overflow-hidden"
      >
        <DialogTitle className="sr-only">Story Viewer</DialogTitle>

        <div className="relative w-full h-full flex flex-col" onClick={handleTap}>
          {/* Progress Bars */}
          <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
            {stories.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-100 ease-linear"
                  style={{
                    width:
                      index < currentIndex
                        ? "100%"
                        : index === currentIndex
                          ? `${progress}%`
                          : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden bg-black">
                  {storyUser?.photoURL ? (
                    <img
                      src={storyUser.photoURL}
                      alt={storyUser.displayName || ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                      {(storyUser?.displayName || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {storyUser?.displayName || "Unknown"}
                </p>
                <p className="text-white/70 text-xs">{formatTime(currentStory.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPaused(p => !p)
                }}
              >
                {isPaused ? (
                  <Play className="h-5 w-5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenChange(false)
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Story Content */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Navigation Hints */}
          <div className="absolute inset-y-0 left-0 w-1/3 flex items-center">
            {currentIndex > 0 && (
              <ChevronLeft className="h-8 w-8 text-white/50 ml-2" />
            )}
          </div>
          <div className="absolute inset-y-0 right-0 w-1/3 flex items-center justify-end">
            {currentIndex < stories.length - 1 && (
              <ChevronRight className="h-8 w-8 text-white/50 mr-2" />
            )}
          </div>

          {/* Viewers Count (only show for own stories) */}
          {currentStory.userId === currentUserId && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm">
                <Eye className="h-4 w-4" />
                <span>{currentStory.viewers.length} view{currentStory.viewers.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

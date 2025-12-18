"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Loader2, MoreVertical, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLongPress } from "@/hooks/use-long-press"

interface VoiceMessageProps {
  audioUrl: string
  isSent: boolean
  duration?: number
  messageId?: string
  onDelete?: (messageId: string) => void
}

export function VoiceMessage({ audioUrl, isSent, duration: propDuration, messageId, onDelete }: VoiceMessageProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration || 0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (onDelete) {
        setShowDeleteDialog(true)
      }
    },
  })

  // Load audio metadata
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
      setIsLoading(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    const handleError = () => {
      setError(true)
      setIsLoading(false)
      console.error("Failed to load audio:", audioUrl)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration)
      }
    }

    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("canplay", handleCanPlay)
    audio.addEventListener("error", handleError)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)

    // Force load
    audio.load()

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("canplay", handleCanPlay)
      audio.removeEventListener("error", handleError)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
    }
  }, [audioUrl])

  const togglePlayPause = async () => {
    if (!audioRef.current || error) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      setIsLoading(true)
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error("Failed to play audio:", err)
        setError(true)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleDelete = () => {
    if (messageId && onDelete) {
      onDelete(messageId)
    }
    setShowDeleteDialog(false)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <>
      <div className="group flex items-center gap-1">
        {isSent && onDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl px-4 py-2 shadow-sm min-w-[200px] select-none",
            isSent
              ? "bg-primary text-primary-foreground message-sent rounded-br-md"
              : "bg-card text-card-foreground border message-received rounded-bl-md",
          )}
          {...longPressHandlers}
        >
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
          />

          <Button
            onClick={togglePlayPause}
            size="icon"
            variant="ghost"
            className={cn("h-8 w-8 rounded-full shrink-0", isSent ? "hover:bg-primary-foreground/20" : "")}
            disabled={isLoading || error}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <div className="flex-1">
            <div className="h-1 bg-current/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-current transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs opacity-70 mt-1">
              {error ? "Failed to load" : `${formatTime(currentTime)} / ${formatTime(duration)}`}
            </p>
          </div>
        </div>

        {!isSent && onDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete voice message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this voice message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

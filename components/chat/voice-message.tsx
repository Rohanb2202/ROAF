"use client"

import { useState, useRef } from "react"
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

export function VoiceMessage({ audioUrl, isSent, duration, messageId, onDelete }: VoiceMessageProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (onDelete) {
        setShowDeleteDialog(true)
      }
    },
  })

  const togglePlayPause = async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      setIsLoading(true)
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (error) {
        console.error("Failed to play audio:", error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const formatTime = (seconds: number) => {
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
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onEnded={() => {
              setIsPlaying(false)
              setCurrentTime(0)
            }}
            onLoadedMetadata={(e) => setIsLoading(false)}
          />

          <Button
            onClick={togglePlayPause}
            size="icon"
            variant="ghost"
            className={cn("h-8 w-8 rounded-full shrink-0", isSent ? "hover:bg-primary-foreground/20" : "")}
            disabled={isLoading}
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
                style={{
                  width: `${audioRef.current?.duration ? (currentTime / audioRef.current.duration) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-xs opacity-70 mt-1">
              {formatTime(currentTime)} / {formatTime(audioRef.current?.duration || duration || 0)}
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

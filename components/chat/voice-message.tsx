"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Play, Pause, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceMessageProps {
  audioUrl: string
  isSent: boolean
  duration?: number
}

export function VoiceMessage({ audioUrl, isSent, duration }: VoiceMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

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

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl px-4 py-2 shadow-sm min-w-[200px]",
        isSent
          ? "bg-primary text-primary-foreground message-sent rounded-br-md"
          : "bg-card text-card-foreground border message-received rounded-bl-md",
      )}
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
  )
}

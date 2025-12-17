"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, BarChart3, Trash2, Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"
import { AttachmentMenu } from "./attachment-menu"
import { EmojiPicker } from "./emoji-picker"
import { StickerPicker } from "./sticker-picker"
import { GifPicker } from "./gif-picker"
import type { TenorGif } from "@/lib/tenor"

interface MessageInputProps {
  onSendMessage: (content: string) => void
  onSendVoiceMessage: (audioBlob: Blob) => void
  onImageSelect: (file: File) => void
  onVideoSelect: (file: File) => void
  onStickerSelect: (pack: string, id: string) => void
  onGifSelect: (gif: TenorGif) => void
  onPollCreate: () => void
  disabled?: boolean
}

type RecordingState = "idle" | "recording" | "preview"

export function MessageInput({
  onSendMessage,
  onSendVoiceMessage,
  onImageSelect,
  onVideoSelect,
  onStickerSelect,
  onGifSelect,
  onPollCreate,
  disabled,
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Recording timer
  useEffect(() => {
    if (recordingState === "recording") {
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [recordingState])

  // Cleanup audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = useCallback(async () => {
    if (disabled || recordingState !== "idle") return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setRecordingState("preview")

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setRecordingState("recording")
    } catch (error) {
      console.error("Failed to start recording:", error)
    }
  }, [disabled, recordingState])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop()
    }
  }, [recordingState])

  const cancelRecording = useCallback(() => {
    // Stop recording if active
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop()
    }

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // Cleanup audio
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    if (audioRef.current) {
      audioRef.current.pause()
    }

    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    setRecordingState("idle")
  }, [recordingState, audioUrl])

  const sendVoiceMessage = useCallback(() => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob)

      // Cleanup
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (audioRef.current) {
        audioRef.current.pause()
      }

      setAudioBlob(null)
      setAudioUrl(null)
      setRecordingTime(0)
      setIsPlaying(false)
      setRecordingState("idle")
    }
  }, [audioBlob, audioUrl, onSendVoiceMessage])

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying, audioUrl])

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleEnded = () => setIsPlaying(false)
    audio.addEventListener("ended", handleEnded)
    return () => audio.removeEventListener("ended", handleEnded)
  }, [])

  // Handle hold events for mic button
  const handleMicMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    startRecording()
  }

  const handleMicMouseUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (recordingState === "recording") {
      stopRecording()
    }
  }

  const handleMicMouseLeave = () => {
    // Don't stop on mouse leave - user might move finger while recording
  }

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newMessage = message.slice(0, start) + emoji + message.slice(end)
      setMessage(newMessage)
      // Move cursor after emoji
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    } else {
      setMessage((prev) => prev + emoji)
    }
  }

  const isRecording = recordingState === "recording"
  const isPreview = recordingState === "preview"

  return (
    <div className="border-t bg-card p-3">
      {/* Hidden audio element for preview playback */}
      <audio ref={audioRef} src={audioUrl || undefined} />

      {/* Recording indicator - shown while holding mic */}
      {isRecording && (
        <div className="flex items-center justify-center gap-3 mb-3 py-3 px-4 bg-red-500/10 rounded-lg">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-500 font-medium">Recording...</span>
          <span className="text-red-500 font-mono text-lg">{formatTime(recordingTime)}</span>
          <span className="text-red-400 text-sm ml-2">Release to stop</span>
        </div>
      )}

      {/* Voice preview - shown after releasing */}
      {isPreview && (
        <div className="flex items-center gap-3 mb-3 py-2 px-4 bg-primary/10 rounded-lg">
          {/* Play/Pause button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
            className="shrink-0 h-10 w-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Waveform placeholder / duration */}
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-8 bg-primary/20 rounded-full flex items-center px-3">
              <div className="flex items-center gap-0.5 flex-1">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full transition-all"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      opacity: isPlaying ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-sm font-mono text-muted-foreground">{formatTime(recordingTime)}</span>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* Send button */}
          <Button
            size="icon"
            onClick={sendVoiceMessage}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main input row - hidden during preview */}
      {!isPreview && (
        <div className="flex items-end gap-1.5">
          {/* Attachment menu */}
          <AttachmentMenu
            onImageSelect={onImageSelect}
            onVideoSelect={onVideoSelect}
            onCameraCapture={onImageSelect}
            disabled={disabled || isRecording}
          />

          {/* Sticker picker */}
          <StickerPicker onStickerSelect={onStickerSelect} disabled={disabled || isRecording} />

          {/* GIF picker */}
          <GifPicker onGifSelect={onGifSelect} disabled={disabled || isRecording} />

          {/* Poll button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onPollCreate}
            disabled={disabled || isRecording}
            className="shrink-0"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="sr-only">Create poll</span>
          </Button>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={isRecording ? "Release to stop recording..." : "Type a message..."}
            disabled={disabled || isRecording}
            className="min-h-[44px] max-h-32 resize-none flex-1"
            rows={1}
          />

          {/* Emoji picker */}
          <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled || isRecording} />

          {/* Send or Record button */}
          {message.trim() ? (
            <Button onClick={handleSend} disabled={disabled} size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          ) : (
            <Button
              disabled={disabled}
              size="icon"
              variant={isRecording ? "destructive" : "default"}
              className={cn(
                "shrink-0 select-none touch-none",
                isRecording && "animate-pulse scale-110"
              )}
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseLeave}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
            >
              <Mic className="h-4 w-4" />
              <span className="sr-only">Hold to record voice message</span>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

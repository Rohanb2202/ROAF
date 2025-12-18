"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, Trash2, Play, Pause, Plus, Image as ImageIcon, Video, Camera, Sticker, ImagePlay, BarChart3, Heart } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CameraCapture } from "./camera-capture"
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
  onLoveNoteCreate?: () => void
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
  onLoveNoteCreate,
  disabled,
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showCamera, setShowCamera] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageSelect(file)
    }
    e.target.value = ""
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onVideoSelect(file)
    }
    e.target.value = ""
  }

  const handleCameraCapture = (file: File) => {
    onImageSelect(file)
    setShowCamera(false)
  }

  return (
    <div className="border-t bg-card p-2">
      {/* Hidden inputs */}
      <audio ref={audioRef} src={audioUrl || undefined} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoChange}
      />

      {/* Recording indicator - shown while holding mic */}
      {isRecording && (
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-red-500/10 rounded-lg mb-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-500 font-medium text-sm">Recording</span>
          <span className="text-red-500 font-mono">{formatTime(recordingTime)}</span>
          <span className="text-red-400 text-xs">Release to stop</span>
        </div>
      )}

      {/* Voice preview - shown after releasing */}
      {isPreview && (
        <div className="flex items-center gap-2 py-2 px-3 bg-primary/10 rounded-lg">
          {/* Play/Pause button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePlayback}
            className="shrink-0 h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          {/* Waveform / duration */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex-1 h-6 bg-primary/20 rounded-full flex items-center px-2 overflow-hidden">
              <div className="flex items-center gap-px flex-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full transition-all flex-shrink-0"
                    style={{
                      height: `${Math.random() * 12 + 6}px`,
                      opacity: isPlaying ? 1 : 0.5,
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs font-mono text-muted-foreground shrink-0">{formatTime(recordingTime)}</span>
          </div>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cancelRecording}
            className="shrink-0 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          {/* Send button */}
          <Button
            size="icon"
            onClick={sendVoiceMessage}
            className="shrink-0 h-9 w-9"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main input row - hidden during preview */}
      {!isPreview && (
        <div className="flex items-end gap-1">
          {/* Attachment menu - contains media options */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled || isRecording}
                className="shrink-0 h-10 w-10"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto p-2">
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant="ghost"
                  className="h-16 w-16 flex-col gap-1 p-1"
                  onClick={() => {
                    setMenuOpen(false)
                    setShowCamera(true)
                  }}
                >
                  <Camera className="h-5 w-5 text-purple-500" />
                  <span className="text-[10px]">Camera</span>
                </Button>
                <Button
                  variant="ghost"
                  className="h-16 w-16 flex-col gap-1 p-1"
                  onClick={() => {
                    setMenuOpen(false)
                    imageInputRef.current?.click()
                  }}
                >
                  <ImageIcon className="h-5 w-5 text-green-500" />
                  <span className="text-[10px]">Photo</span>
                </Button>
                <Button
                  variant="ghost"
                  className="h-16 w-16 flex-col gap-1 p-1"
                  onClick={() => {
                    setMenuOpen(false)
                    videoInputRef.current?.click()
                  }}
                >
                  <Video className="h-5 w-5 text-blue-500" />
                  <span className="text-[10px]">Video</span>
                </Button>
                <StickerPicker
                  onStickerSelect={(pack, id) => {
                    setMenuOpen(false)
                    onStickerSelect(pack, id)
                  }}
                  disabled={disabled || isRecording}
                  asMenuItem
                />
                <GifPicker
                  onGifSelect={(gif) => {
                    setMenuOpen(false)
                    onGifSelect(gif)
                  }}
                  disabled={disabled || isRecording}
                  asMenuItem
                />
                <Button
                  variant="ghost"
                  className="h-16 w-16 flex-col gap-1 p-1"
                  onClick={() => {
                    setMenuOpen(false)
                    onPollCreate()
                  }}
                >
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <span className="text-[10px]">Poll</span>
                </Button>
                {onLoveNoteCreate && (
                  <Button
                    variant="ghost"
                    className="h-16 w-16 flex-col gap-1 p-1"
                    onClick={() => {
                      setMenuOpen(false)
                      onLoveNoteCreate()
                    }}
                  >
                    <Heart className="h-5 w-5 text-pink-500" />
                    <span className="text-[10px]">Love Note</span>
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Text input */}
          <div className="flex-1 flex items-end bg-muted/50 rounded-full px-3 py-1 min-w-0">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={isRecording ? "Release to stop..." : "Message"}
              disabled={disabled || isRecording}
              className="min-h-[36px] max-h-24 resize-none flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2 px-0 text-sm"
              rows={1}
            />
            {/* Emoji picker inside input area */}
            <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled || isRecording} />
          </div>

          {/* Send or Record button */}
          {message.trim() ? (
            <Button onClick={handleSend} disabled={disabled} size="icon" className="shrink-0 h-10 w-10 rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              disabled={disabled}
              size="icon"
              variant={isRecording ? "destructive" : "default"}
              className={cn(
                "shrink-0 h-10 w-10 rounded-full select-none touch-none",
                isRecording && "animate-pulse scale-110"
              )}
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseLeave}
              onTouchStart={handleMicMouseDown}
              onTouchEnd={handleMicMouseUp}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Camera Capture Dialog */}
      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handleCameraCapture}
      />
    </div>
  )
}

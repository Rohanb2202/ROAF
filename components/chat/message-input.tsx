"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AttachmentMenu } from "./attachment-menu"
import { EmojiPicker } from "./emoji-picker"
import { StickerPicker } from "./sticker-picker"
import { GifPicker } from "./gif-picker"
import type { TenorGif } from "@/lib/tenor"

interface MessageInputProps {
  onSendMessage: (content: string) => void
  onStartRecording: () => void
  onImageSelect: (file: File) => void
  onVideoSelect: (file: File) => void
  onStickerSelect: (pack: string, id: string) => void
  onGifSelect: (gif: TenorGif) => void
  onPollCreate: () => void
  isRecording: boolean
  disabled?: boolean
}

export function MessageInput({
  onSendMessage,
  onStartRecording,
  onImageSelect,
  onVideoSelect,
  onStickerSelect,
  onGifSelect,
  onPollCreate,
  isRecording,
  disabled,
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="border-t bg-card p-3">
      <div className="flex items-end gap-1.5">
        {/* Attachment menu */}
        <AttachmentMenu
          onImageSelect={onImageSelect}
          onVideoSelect={onVideoSelect}
          onCameraCapture={onImageSelect}
          disabled={disabled}
        />

        {/* Sticker picker */}
        <StickerPicker onStickerSelect={onStickerSelect} disabled={disabled} />

        {/* GIF picker */}
        <GifPicker onGifSelect={onGifSelect} disabled={disabled} />

        {/* Poll button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onPollCreate}
          disabled={disabled}
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
          placeholder="Type a message..."
          disabled={disabled}
          className="min-h-[44px] max-h-32 resize-none flex-1"
          rows={1}
        />

        {/* Emoji picker */}
        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={disabled} />

        {/* Send or Record button */}
        {message.trim() ? (
          <Button onClick={handleSend} disabled={disabled} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        ) : (
          <Button
            onClick={onStartRecording}
            disabled={disabled}
            size="icon"
            variant={isRecording ? "destructive" : "default"}
            className="shrink-0"
          >
            <Mic className={cn("h-4 w-4", isRecording && "animate-pulse")} />
            <span className="sr-only">{isRecording ? "Stop recording" : "Record voice message"}</span>
          </Button>
        )}
      </div>
    </div>
  )
}

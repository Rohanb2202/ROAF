"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Smile } from "lucide-react"
import EmojiPickerReact, { Theme } from "emoji-picker-react"

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    onEmojiSelect(emojiData.emoji)
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="shrink-0"
        >
          <Smile className="h-5 w-5" />
          <span className="sr-only">Emoji picker</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-auto p-0 border-none bg-transparent shadow-none"
      >
        <EmojiPickerReact
          onEmojiClick={handleEmojiClick}
          theme={Theme.AUTO}
          searchPlaceholder="Search emoji..."
          skinTonesDisabled={false}
          width={320}
          height={400}
        />
      </PopoverContent>
    </Popover>
  )
}

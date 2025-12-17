"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sticker } from "lucide-react"
import { cn } from "@/lib/utils"

interface StickerPickerProps {
  onStickerSelect: (pack: string, id: string) => void
  disabled?: boolean
}

// Sticker packs using emojis (can be replaced with actual PNG stickers)
const STICKER_PACKS = {
  reactions: {
    name: "Reactions",
    icon: "👍",
    stickers: [
      { id: "thumbsup", emoji: "👍" },
      { id: "thumbsdown", emoji: "👎" },
      { id: "heart", emoji: "❤️" },
      { id: "fire", emoji: "🔥" },
      { id: "laugh", emoji: "😂" },
      { id: "cry", emoji: "😢" },
      { id: "angry", emoji: "😠" },
      { id: "shock", emoji: "😱" },
      { id: "think", emoji: "🤔" },
      { id: "clap", emoji: "👏" },
      { id: "pray", emoji: "🙏" },
      { id: "ok", emoji: "👌" },
    ],
  },
  emotions: {
    name: "Emotions",
    icon: "😊",
    stickers: [
      { id: "happy", emoji: "😊" },
      { id: "sad", emoji: "😢" },
      { id: "love", emoji: "😍" },
      { id: "cool", emoji: "😎" },
      { id: "wink", emoji: "😉" },
      { id: "kiss", emoji: "😘" },
      { id: "tongue", emoji: "😛" },
      { id: "sleep", emoji: "😴" },
      { id: "sick", emoji: "🤒" },
      { id: "party", emoji: "🥳" },
      { id: "nerd", emoji: "🤓" },
      { id: "devil", emoji: "😈" },
    ],
  },
  animals: {
    name: "Animals",
    icon: "🐱",
    stickers: [
      { id: "cat", emoji: "🐱" },
      { id: "dog", emoji: "🐶" },
      { id: "bear", emoji: "🐻" },
      { id: "panda", emoji: "🐼" },
      { id: "monkey", emoji: "🐵" },
      { id: "lion", emoji: "🦁" },
      { id: "fox", emoji: "🦊" },
      { id: "rabbit", emoji: "🐰" },
      { id: "unicorn", emoji: "🦄" },
      { id: "dragon", emoji: "🐉" },
      { id: "owl", emoji: "🦉" },
      { id: "butterfly", emoji: "🦋" },
    ],
  },
  food: {
    name: "Food",
    icon: "🍕",
    stickers: [
      { id: "pizza", emoji: "🍕" },
      { id: "burger", emoji: "🍔" },
      { id: "fries", emoji: "🍟" },
      { id: "hotdog", emoji: "🌭" },
      { id: "taco", emoji: "🌮" },
      { id: "sushi", emoji: "🍣" },
      { id: "icecream", emoji: "🍦" },
      { id: "cake", emoji: "🎂" },
      { id: "donut", emoji: "🍩" },
      { id: "coffee", emoji: "☕" },
      { id: "beer", emoji: "🍺" },
      { id: "wine", emoji: "🍷" },
    ],
  },
  celebration: {
    name: "Party",
    icon: "🎉",
    stickers: [
      { id: "party", emoji: "🎉" },
      { id: "confetti", emoji: "🎊" },
      { id: "balloon", emoji: "🎈" },
      { id: "gift", emoji: "🎁" },
      { id: "trophy", emoji: "🏆" },
      { id: "medal", emoji: "🥇" },
      { id: "crown", emoji: "👑" },
      { id: "star", emoji: "⭐" },
      { id: "sparkle", emoji: "✨" },
      { id: "rainbow", emoji: "🌈" },
      { id: "rocket", emoji: "🚀" },
      { id: "100", emoji: "💯" },
    ],
  },
}

export function StickerPicker({ onStickerSelect, disabled }: StickerPickerProps) {
  const [activePack, setActivePack] = useState<keyof typeof STICKER_PACKS>("reactions")
  const [isOpen, setIsOpen] = useState(false)

  const handleStickerClick = (packId: string, stickerId: string) => {
    onStickerSelect(packId, stickerId)
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
          <Sticker className="h-5 w-5" />
          <span className="sr-only">Sticker picker</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        className="w-80 p-0"
      >
        {/* Pack tabs */}
        <div className="flex border-b p-1 gap-1">
          {Object.entries(STICKER_PACKS).map(([packId, pack]) => (
            <Button
              key={packId}
              variant={activePack === packId ? "secondary" : "ghost"}
              size="sm"
              className="shrink-0 text-lg px-2"
              onClick={() => setActivePack(packId as keyof typeof STICKER_PACKS)}
              title={pack.name}
            >
              {pack.icon}
            </Button>
          ))}
        </div>

        {/* Sticker grid */}
        <div className="grid grid-cols-4 gap-2 p-3 max-h-48 overflow-y-auto">
          {STICKER_PACKS[activePack].stickers.map((sticker) => (
            <button
              key={sticker.id}
              className={cn(
                "w-14 h-14 flex items-center justify-center text-4xl rounded-lg",
                "hover:bg-muted transition-colors"
              )}
              onClick={() => handleStickerClick(activePack, sticker.id)}
            >
              {sticker.emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Export sticker data for use in sticker-message
export { STICKER_PACKS }

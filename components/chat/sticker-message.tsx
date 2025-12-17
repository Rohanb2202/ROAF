"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock } from "lucide-react"
import type { Message } from "@/lib/firebase/firestore"
import { STICKER_PACKS } from "./sticker-picker"

interface StickerMessageProps {
  message: Message
  isSent: boolean
}

export function StickerMessage({ message, isSent }: StickerMessageProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case "sending":
        return <Clock className="h-3 w-3" />
      case "sent":
        return <Check className="h-3 w-3" />
      case "delivered":
        return <CheckCheck className="h-3 w-3" />
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-500" />
    }
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Get sticker emoji from packs
  const getSticker = () => {
    const pack = STICKER_PACKS[message.stickerPack as keyof typeof STICKER_PACKS]
    if (!pack) return "❓"
    const sticker = pack.stickers.find((s) => s.id === message.stickerId)
    return sticker?.emoji || "❓"
  }

  return (
    <div className={cn("flex w-full mb-2", isSent ? "justify-end" : "justify-start")}>
      <div className={cn("flex flex-col", isSent ? "items-end" : "items-start")}>
        <div
          className={cn(
            "w-24 h-24 flex items-center justify-center text-7xl",
            isSent ? "message-sent" : "message-received"
          )}
        >
          {getSticker()}
        </div>
        <div className={cn(
          "flex items-center gap-1 mt-1 text-xs text-muted-foreground",
          isSent ? "justify-end" : "justify-start"
        )}>
          <span>{formatTime(message.createdAt)}</span>
          {isSent && <span className="opacity-70">{getStatusIcon()}</span>}
        </div>
      </div>
    </div>
  )
}

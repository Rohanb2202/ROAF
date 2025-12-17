"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, Lock } from "lucide-react"
import type { Message } from "@/lib/firebase/firestore"

interface MessageBubbleProps {
  message: Message
  decryptedContent: string
  isSent: boolean
}

export function MessageBubble({ message, decryptedContent, isSent }: MessageBubbleProps) {
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

  const isDecryptionFailed = decryptedContent === "[Failed to decrypt]"

  return (
    <div className={cn("flex w-full mb-2", isSent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
          isSent
            ? "bg-primary text-primary-foreground message-sent rounded-br-md"
            : "bg-card text-card-foreground border message-received rounded-bl-md",
        )}
      >
        {isDecryptionFailed ? (
          <div className="flex items-center gap-2 text-sm opacity-60 italic">
            <Lock className="h-3 w-3" />
            <span>Message unavailable</span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed break-words">{decryptedContent}</p>
        )}
        <div className={cn("flex items-center gap-1 mt-1", isSent ? "justify-end" : "justify-start")}>
          <span className="text-xs opacity-70">{formatTime(message.createdAt)}</span>
          {isSent && <span className="opacity-70">{getStatusIcon()}</span>}
        </div>
      </div>
    </div>
  )
}

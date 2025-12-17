"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock } from "lucide-react"
import type { Message } from "@/lib/firebase/firestore"

interface GifMessageProps {
  message: Message
  isSent: boolean
}

export function GifMessage({ message, isSent }: GifMessageProps) {
  const [isLoading, setIsLoading] = useState(true)

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

  return (
    <div className={cn("flex w-full mb-2", isSent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden shadow-sm",
          "w-fit max-w-[280px]",
          isSent
            ? "bg-primary message-sent rounded-br-md"
            : "bg-card border message-received rounded-bl-md"
        )}
      >
        <div className="relative w-full">
          {isLoading && (
            <div className="absolute inset-0 bg-muted animate-pulse min-h-[150px] min-w-[200px]" />
          )}
          <img
            src={message.gifUrl}
            alt="GIF"
            className={cn(
              "w-full h-auto object-contain",
              isLoading && "opacity-0"
            )}
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Time and status overlay */}
        <div className={cn(
          "absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full",
          "bg-black/50 text-white text-xs"
        )}>
          <span>{formatTime(message.createdAt)}</span>
          {isSent && <span>{getStatusIcon()}</span>}
        </div>

        {/* Tenor attribution */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] text-white/70 bg-black/30 px-1 rounded">via Tenor</span>
        </div>
      </div>
    </div>
  )
}

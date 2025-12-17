"use client"

import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, BarChart3, CheckCircle2 } from "lucide-react"
import type { Message } from "@/lib/firebase/firestore"

interface PollMessageProps {
  message: Message
  isSent: boolean
  currentUserId: string
  onVote: (optionId: string) => void
}

export function PollMessage({ message, isSent, currentUserId, onVote }: PollMessageProps) {
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

  const totalVotes = message.pollOptions?.reduce((sum, opt) => sum + opt.votes.length, 0) || 0
  const userVotedOption = message.pollOptions?.find(opt => opt.votes.includes(currentUserId))

  return (
    <div className={cn("flex w-full mb-2", isSent ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm",
          isSent
            ? "bg-primary text-primary-foreground message-sent rounded-br-md"
            : "bg-card text-card-foreground border message-received rounded-bl-md"
        )}
      >
        {/* Poll Header */}
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-medium opacity-70">Poll</span>
          {message.pollEnded && (
            <span className="text-xs bg-muted/20 px-2 py-0.5 rounded-full">Ended</span>
          )}
        </div>

        {/* Question */}
        <p className="font-medium mb-3">{message.pollQuestion}</p>

        {/* Options */}
        <div className="space-y-2">
          {message.pollOptions?.map((option) => {
            const votePercentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0
            const isUserVote = option.votes.includes(currentUserId)
            const showResults = userVotedOption || message.pollEnded

            return (
              <button
                key={option.id}
                className={cn(
                  "w-full text-left py-2.5 px-3 relative overflow-hidden rounded-lg border transition-colors",
                  isSent
                    ? "border-white/40 bg-white/10 hover:bg-white/20"
                    : "border-border bg-background hover:bg-muted",
                  isUserVote && (isSent ? "border-white" : "border-primary"),
                  message.pollEnded && "pointer-events-none opacity-80"
                )}
                onClick={() => !message.pollEnded && onVote(option.id)}
              >
                {/* Progress Bar Background */}
                {showResults && (
                  <div
                    className={cn(
                      "absolute left-0 top-0 bottom-0 transition-all duration-300 rounded-lg",
                      isSent ? "bg-white/25" : "bg-primary/20"
                    )}
                    style={{ width: `${votePercentage}%` }}
                  />
                )}

                {/* Content */}
                <div className="flex items-center justify-between w-full relative z-10">
                  <div className="flex items-center gap-2">
                    {isUserVote && (
                      <CheckCircle2 className={cn(
                        "h-4 w-4",
                        isSent ? "text-white" : "text-primary"
                      )} />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      isSent ? "text-white" : "text-foreground"
                    )}>
                      {option.text}
                    </span>
                  </div>
                  {showResults && (
                    <span className={cn(
                      "text-xs font-semibold",
                      isSent ? "text-white/90" : "text-muted-foreground"
                    )}>
                      {Math.round(votePercentage)}%
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Vote Count */}
        <div className={cn(
          "flex items-center justify-between mt-3 text-xs",
          isSent ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-1">
            <span>{formatTime(message.createdAt)}</span>
            {isSent && <span>{getStatusIcon()}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

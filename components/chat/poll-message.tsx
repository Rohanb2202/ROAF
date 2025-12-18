"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, BarChart3, CheckCircle2, MoreVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useLongPress } from "@/hooks/use-long-press"
import type { Message } from "@/lib/firebase/firestore"

interface PollMessageProps {
  message: Message
  isSent: boolean
  currentUserId: string
  onVote: (optionId: string) => void
  onDelete?: (messageId: string) => void
}

export function PollMessage({ message, isSent, currentUserId, onVote, onDelete }: PollMessageProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (onDelete) {
        setShowDeleteDialog(true)
      }
    },
  })

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

  const handleDelete = () => {
    if (message.id && onDelete) {
      onDelete(message.id)
    }
    setShowDeleteDialog(false)
  }

  const totalVotes = message.pollOptions?.reduce((sum, opt) => sum + opt.votes.length, 0) || 0
  const userVotedOption = message.pollOptions?.find(opt => opt.votes.includes(currentUserId))

  return (
    <>
      <div className={cn("flex w-full mb-2 group", isSent ? "justify-end" : "justify-start")}>
        {/* Delete menu - shown on left for sent messages */}
        {isSent && onDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mr-1 self-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <div
          className={cn(
            "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm select-none",
            isSent
              ? "bg-primary text-primary-foreground message-sent rounded-br-md"
              : "bg-card text-card-foreground border message-received rounded-bl-md"
          )}
          {...longPressHandlers}
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

        {/* Delete menu - shown on right for received messages */}
        {!isSent && onDelete && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 self-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete poll?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this poll. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

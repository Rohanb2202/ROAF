"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, MoreVertical, Trash2 } from "lucide-react"
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

interface GifMessageProps {
  message: Message
  isSent: boolean
  onDelete?: (messageId: string) => void
}

export function GifMessage({ message, isSent, onDelete }: GifMessageProps) {
  const [isLoading, setIsLoading] = useState(true)
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
            "relative rounded-2xl overflow-hidden shadow-sm select-none",
            "w-fit max-w-[280px]",
            isSent
              ? "bg-primary message-sent rounded-br-md"
              : "bg-card border message-received rounded-bl-md"
          )}
          {...longPressHandlers}
        >
          <div className="relative w-full">
            {isLoading && (
              <div className="absolute inset-0 bg-muted animate-pulse min-h-[150px] min-w-[200px]" />
            )}
            <img
              src={message.gifUrl}
              alt="GIF"
              className={cn(
                "w-full h-auto object-contain pointer-events-none",
                isLoading && "opacity-0"
              )}
              onLoad={() => setIsLoading(false)}
              draggable={false}
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
            <AlertDialogTitle>Delete GIF?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this GIF. This action cannot be undone.
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

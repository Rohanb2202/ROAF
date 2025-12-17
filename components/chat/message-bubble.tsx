"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, Lock, Trash2, MoreVertical } from "lucide-react"
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
import type { Message } from "@/lib/firebase/firestore"

interface MessageBubbleProps {
  message: Message
  decryptedContent: string
  isSent: boolean
  onDelete?: (messageId: string) => void
}

export function MessageBubble({ message, decryptedContent, isSent, onDelete }: MessageBubbleProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
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
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message. This action cannot be undone.
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

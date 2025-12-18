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
import { STICKER_PACKS } from "./sticker-picker"

interface StickerMessageProps {
  message: Message
  isSent: boolean
  onDelete?: (messageId: string) => void
}

export function StickerMessage({ message, isSent, onDelete }: StickerMessageProps) {
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

  // Get sticker emoji from packs
  const getSticker = () => {
    const pack = STICKER_PACKS[message.stickerPack as keyof typeof STICKER_PACKS]
    if (!pack) return "❓"
    const sticker = pack.stickers.find((s) => s.id === message.stickerId)
    return sticker?.emoji || "❓"
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

        <div className={cn("flex flex-col select-none", isSent ? "items-end" : "items-start")}>
          <div
            className={cn(
              "w-24 h-24 flex items-center justify-center text-7xl",
              isSent ? "message-sent" : "message-received"
            )}
            {...longPressHandlers}
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
            <AlertDialogTitle>Delete sticker?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this sticker. This action cannot be undone.
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

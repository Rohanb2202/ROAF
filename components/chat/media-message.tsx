"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Check, CheckCheck, Clock, Play, X, Download, MoreVertical, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
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

interface MediaMessageProps {
  message: Message
  isSent: boolean
  onDelete?: (messageId: string) => void
}

export function MediaMessage({ message, isSent, onDelete }: MediaMessageProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDownload = () => {
    if (!message.storageUrl) return

    // For images, use canvas to bypass CORS
    if (message.type === "image") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = `ROAF_image_${Date.now()}.jpg`
              link.click()
              URL.revokeObjectURL(url)
            }
          }, 'image/jpeg', 0.95)
        }
      }
      img.onerror = () => {
        // Fallback: open in new tab
        window.open(message.storageUrl, "_blank")
      }
      img.src = message.storageUrl!
    } else {
      // For videos, open in new tab (user can save from there)
      window.open(message.storageUrl, "_blank")
    }
  }

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

  const aspectRatio = message.mediaWidth && message.mediaHeight
    ? message.mediaWidth / message.mediaHeight
    : 1

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
            "relative rounded-2xl overflow-hidden shadow-sm cursor-pointer",
            "w-fit max-w-[280px]",
            isSent
              ? "bg-primary message-sent rounded-br-md"
              : "bg-card border message-received rounded-bl-md"
          )}
          onClick={() => setIsOpen(true)}
        >
          {message.type === "image" ? (
            <div className="relative w-full" style={{ aspectRatio }}>
              {isLoading && (
                <div className="absolute inset-0 bg-muted animate-pulse" />
              )}
              <img
                src={message.storageUrl}
                alt="Shared image"
                className={cn(
                  "w-full h-full object-cover",
                  isLoading && "opacity-0"
                )}
                onLoad={() => setIsLoading(false)}
              />
            </div>
          ) : (
            <div className="relative w-full" style={{ aspectRatio }}>
              {message.thumbnailUrl ? (
                <>
                  <img
                    src={message.thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-6 w-6 text-black ml-1" />
                    </div>
                  </div>
                </>
              ) : (
                <video
                  src={message.storageUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
              )}
            </div>
          )}

          {/* Time and status overlay */}
          <div className={cn(
            "absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full",
            "bg-black/50 text-white text-xs"
          )}>
            <span>{formatTime(message.createdAt)}</span>
            {isSent && <span>{getStatusIcon()}</span>}
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

      {/* Lightbox Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Media viewer</DialogTitle>
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-6 w-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          {message.type === "image" ? (
            <img
              src={message.storageUrl}
              alt="Shared image"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
          ) : (
            <video
              src={message.storageUrl}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] mx-auto"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {message.type === "image" ? "image" : "video"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {message.type === "image" ? "image" : "video"}. This action cannot be undone.
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

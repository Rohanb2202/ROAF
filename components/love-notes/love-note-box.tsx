"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Heart, Lock, Clock, Gift, Sparkles, Calendar, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LoveNote } from "@/lib/firebase/firestore"

interface LoveNoteBoxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notes: LoveNote[]
  onNoteRead: (noteId: string) => void
  decryptNote: (note: LoveNote) => Promise<string>
}

export function LoveNoteBox({ open, onOpenChange, notes, onNoteRead, decryptNote }: LoveNoteBoxProps) {
  const [selectedNote, setSelectedNote] = useState<LoveNote | null>(null)
  const [decryptedContent, setDecryptedContent] = useState<string>("")
  const [isDecrypting, setIsDecrypting] = useState(false)

  const sealedNotes = notes.filter(n => n.isSealed)
  const revealedNotes = notes.filter(n => !n.isSealed)

  const handleOpenNote = async (note: LoveNote) => {
    if (note.isSealed) return

    setSelectedNote(note)
    setIsDecrypting(true)

    try {
      const content = await decryptNote(note)
      setDecryptedContent(content)
      onNoteRead(note.id!)
    } catch (error) {
      setDecryptedContent("Failed to decrypt note")
    } finally {
      setIsDecrypting(false)
    }
  }

  const handleCloseNote = () => {
    setSelectedNote(null)
    setDecryptedContent("")
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getTimeUntilReveal = (revealAt: any) => {
    const now = new Date()
    const reveal = revealAt.toDate ? revealAt.toDate() : new Date(revealAt)
    const diff = reveal.getTime() - now.getTime()

    if (diff <= 0) return "Revealing soon..."

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days} day${days > 1 ? 's' : ''} left`
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m left`
    }

    return `${minutes}m left`
  }

  const getOccasionIcon = (occasion?: string) => {
    if (!occasion) return Heart
    if (occasion.toLowerCase().includes("birthday")) return Gift
    if (occasion.toLowerCase().includes("anniversary")) return Sparkles
    return Calendar
  }

  // Note detail view
  if (selectedNote) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="sr-only">Love Note</DialogTitle>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2"
              onClick={handleCloseNote}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="text-center pt-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 mb-4">
                <Heart className="h-8 w-8 text-white fill-current" />
              </div>

              {selectedNote.occasion && (
                <p className="text-sm font-medium text-pink-500 mb-2">
                  {selectedNote.occasion}
                </p>
              )}

              <p className="text-xs text-muted-foreground mb-4">
                {formatDate(selectedNote.createdAt)}
              </p>
            </div>

            <div className="bg-pink-50 dark:bg-pink-950/30 rounded-2xl p-6 min-h-[200px]">
              {isDecrypting ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
                </div>
              ) : (
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {decryptedContent}
                </p>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              This note will disappear in 24 hours
            </p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Notes list view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pink-500">
            <Heart className="h-5 w-5 fill-current" />
            Love Notes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4">
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No love notes yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Write one for your partner!
              </p>
            </div>
          ) : (
            <>
              {/* Sealed Notes */}
              {sealedNotes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Sealed Notes
                  </h3>
                  {sealedNotes.map((note) => {
                    const Icon = getOccasionIcon(note.occasion)
                    return (
                      <div
                        key={note.id}
                        className="bg-muted/50 rounded-xl p-4 border border-dashed border-muted-foreground/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-muted-foreground flex items-center gap-1">
                              <Icon className="h-4 w-4" />
                              {note.occasion || "Love Note"}
                            </p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getTimeUntilReveal(note.revealAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Revealed Notes */}
              {revealedNotes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Heart className="h-3 w-3 fill-current text-pink-500" /> Ready to Read
                  </h3>
                  {revealedNotes.map((note) => {
                    const Icon = getOccasionIcon(note.occasion)
                    return (
                      <button
                        key={note.id}
                        onClick={() => handleOpenNote(note)}
                        className={cn(
                          "w-full bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/50",
                          "rounded-xl p-4 border border-pink-200 dark:border-pink-900",
                          "hover:border-pink-400 dark:hover:border-pink-700 transition-all",
                          "text-left"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                            <Heart className="h-5 w-5 text-white fill-current" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-pink-600 dark:text-pink-400 flex items-center gap-1">
                              <Icon className="h-4 w-4" />
                              {note.occasion || "Love Note"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Tap to read
                            </p>
                          </div>
                          <Sparkles className="h-5 w-5 text-pink-400 animate-pulse" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Heart, Calendar, Gift, Sparkles, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoveNoteCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateNote: (content: string, revealAt: Date, occasion?: string) => void
}

const OCCASIONS = [
  { id: "daily", label: "Daily Note", icon: Heart, description: "Reveals tonight at midnight" },
  { id: "birthday", label: "Birthday", icon: Gift, description: "Set the date" },
  { id: "anniversary", label: "Anniversary", icon: Sparkles, description: "Set the date" },
  { id: "custom", label: "Custom Date", icon: Calendar, description: "Pick a specific date" },
]

const PROMPTS = [
  "What I love most about you today...",
  "A moment I'll never forget with you...",
  "You make me feel...",
  "My favorite thing about us is...",
  "I'm grateful for you because...",
  "When I think of you, I...",
  "Our future together looks like...",
  "The little things you do that make me smile...",
]

export function LoveNoteCreator({ open, onOpenChange, onCreateNote }: LoveNoteCreatorProps) {
  const [content, setContent] = useState("")
  const [occasion, setOccasion] = useState("daily")
  const [customDate, setCustomDate] = useState("")
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)

  const getRevealDate = (): Date => {
    const now = new Date()

    if (occasion === "daily") {
      // Reveal at midnight tonight
      const tonight = new Date(now)
      tonight.setHours(23, 59, 59, 999)
      return tonight
    }

    if (customDate) {
      const date = new Date(customDate)
      date.setHours(20, 0, 0, 0) // Reveal at 8 PM on the selected date
      return date
    }

    // Default to tonight
    const tonight = new Date(now)
    tonight.setHours(23, 59, 59, 999)
    return tonight
  }

  const handleCreate = () => {
    if (!content.trim()) return

    const revealAt = getRevealDate()
    const occasionLabel = occasion === "daily" ? undefined : OCCASIONS.find(o => o.id === occasion)?.label

    onCreateNote(content.trim(), revealAt, occasionLabel)
    handleReset()
  }

  const handleReset = () => {
    setContent("")
    setOccasion("daily")
    setCustomDate("")
    setSelectedPrompt(null)
    onOpenChange(false)
  }

  const handlePromptSelect = (prompt: string) => {
    if (selectedPrompt === prompt) {
      setSelectedPrompt(null)
      setContent("")
    } else {
      setSelectedPrompt(prompt)
      setContent(prompt + "\n\n")
    }
  }

  const needsDatePicker = occasion === "birthday" || occasion === "anniversary" || occasion === "custom"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-pink-500">
            <Heart className="h-5 w-5 fill-current" />
            Write a Love Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Occasion Selection */}
          <div className="space-y-3">
            <Label>When should this note be revealed?</Label>
            <div className="grid grid-cols-2 gap-2">
              {OCCASIONS.map((occ) => {
                const Icon = occ.icon
                return (
                  <button
                    key={occ.id}
                    onClick={() => setOccasion(occ.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                      occasion === occ.id
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-950"
                        : "border-border hover:border-pink-300"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      occasion === occ.id ? "text-pink-500" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      occasion === occ.id ? "text-pink-500" : ""
                    )}>
                      {occ.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{occ.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Picker for special occasions */}
          {needsDatePicker && (
            <div className="space-y-2">
              <Label htmlFor="reveal-date">Reveal Date</Label>
              <Input
                id="reveal-date"
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Note will be revealed at 8:00 PM on this date
              </p>
            </div>
          )}

          {/* Writing Prompts */}
          <div className="space-y-3">
            <Label>Need inspiration? Try a prompt:</Label>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptSelect(prompt)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                    selectedPrompt === prompt
                      ? "border-pink-500 bg-pink-50 dark:bg-pink-950 text-pink-600"
                      : "border-border hover:border-pink-300"
                  )}
                >
                  {prompt.slice(0, 25)}...
                </button>
              ))}
            </div>
          </div>

          {/* Note Content */}
          <div className="space-y-2">
            <Label htmlFor="note-content">Your Note</Label>
            <Textarea
              id="note-content"
              placeholder="Write something sweet..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {content.length}/1000
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-pink-50 dark:bg-pink-950/50 border border-pink-200 dark:border-pink-900 rounded-lg p-3">
            <p className="text-sm text-pink-700 dark:text-pink-300">
              <Heart className="h-4 w-4 inline mr-1 fill-current" />
              Your note will be sealed until the reveal time. Your partner won't be able to peek!
              The note will expire 24 hours after reveal.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-pink-500 hover:bg-pink-600"
              onClick={handleCreate}
              disabled={!content.trim() || (needsDatePicker && !customDate)}
            >
              <Heart className="h-4 w-4 mr-2 fill-current" />
              Seal & Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

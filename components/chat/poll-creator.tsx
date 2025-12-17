"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X, BarChart3 } from "lucide-react"

interface PollCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreatePoll: (question: string, options: string[]) => void
}

export function PollCreator({ open, onOpenChange, onCreatePoll }: PollCreatorProps) {
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreate = () => {
    const validOptions = options.filter(opt => opt.trim() !== "")
    if (question.trim() && validOptions.length >= 2) {
      onCreatePoll(question.trim(), validOptions)
      handleReset()
    }
  }

  const handleReset = () => {
    setQuestion("")
    setOptions(["", ""])
    onOpenChange(false)
  }

  const isValid = question.trim() !== "" && options.filter(opt => opt.trim() !== "").length >= 2

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Create Poll
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Question */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <Input
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Options</label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleRemoveOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Add Option Button */}
          {options.length < 6 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAddOption}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReset}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={!isValid}
            >
              Create Poll
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
